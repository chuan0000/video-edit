//! PodFlow Pro - Multi-Camera AI Podcast Video Editor
//! Tauri v2 Rust Backend (Intel x86_64 / Universal Architecture)
//!
//! Architectural Optimizations for Intel® Core™ & Intel® Arc™:
//! 1. Hardware Encoder Waterfall: Intel Quick Sync Video (h264_qsv) -> Windows Media Foundation (h264_mf) -> NVIDIA NVENC (h264_nvenc) -> Multi-threaded CPU libx264 (AVX2/AVX-512).
//! 2. Win32 CLI Length Protection: Uses `-filter_complex_script` file pipeline to permanently eliminate 32KB CreateProcess argument overflow crashes.
//! 3. Resilient Stream Normalization: Automatically pads, scales (1080p), aligns SAR=1 and locks 30fps to avoid cross-camera concat synchronization failure.
//! 4. Dynamic Multi-Camera Mapping: Supports 1, 2, or 3 camera configurations without crashing on missing camera inputs.
//! 5. AI Auto Director Integration: Real speaker voice detection & automated camera switching pipeline.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Creation flag on Windows to prevent console window from flashing
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipSegment {
    pub id: String,
    pub camera: String, // "A" | "B" | "C"
    #[serde(rename = "startTime")]
    pub start_time: f64,
    #[serde(rename = "endTime")]
    pub end_time: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AudioMasteringProps {
    #[serde(rename = "enableLoudnessNorm", default)]
    pub enable_loudness_norm: bool,
    #[serde(rename = "targetLufs", default = "default_target_lufs")]
    pub target_lufs: i32,
    #[serde(rename = "enableAutoLeveler", default)]
    pub enable_auto_leveler: bool,
    #[serde(rename = "autoLevelerStrength", default = "default_leveler_strength")]
    pub auto_leveler_strength: f64,
    #[serde(rename = "enableHighPassRumble", default)]
    pub enable_high_pass_rumble: bool,
    #[serde(rename = "enableDeEsser", default)]
    pub enable_de_esser: bool,
    #[serde(rename = "enableDePlosive", default)]
    pub enable_de_plosive: bool,
    #[serde(rename = "enableDeReverb", default)]
    pub enable_de_reverb: bool,
    #[serde(rename = "deReverbAmount", default = "default_reverb_amount")]
    pub de_reverb_amount: f64,
}

fn default_target_lufs() -> i32 { -14 }
fn default_leveler_strength() -> f64 { 80.0 }
fn default_reverb_amount() -> f64 { 50.0 }

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MulticamInputs {
    #[serde(rename = "cameraA", alias = "camera_a")]
    pub camera_a: String,
    #[serde(rename = "cameraB", alias = "camera_b", default)]
    pub camera_b: String,
    #[serde(rename = "cameraC", alias = "camera_c", default)]
    pub camera_c: String,
    #[serde(default)]
    pub podcast_audio: Option<String>,
    #[serde(rename = "masterAudioCamera", alias = "master_audio_camera")]
    pub master_audio_camera: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHardwareInfo {
    pub os: String,
    pub arch: String,
    pub cpu_cores: usize,
    pub is_intel_x64: bool,
    pub available_encoders: Vec<String>,
    pub recommended_encoder: String,
}

/// Generates an FFmpeg complex filtergraph script file.
fn build_filtergraph_script(
    segments: &[ClipSegment],
    camera_to_input_idx: &HashMap<String, usize>,
    use_master_audio: bool,
) -> Result<String, String> {
    if segments.is_empty() {
        return Err("No timeline segments provided for export.".to_string());
    }

    let mut filter_script = String::with_capacity(4096);
    let mut v_concat_labels = String::new();
    let mut a_concat_labels = String::new();
    let mut valid_count = 0usize;

    for seg in segments.iter() {
        let cam_key = seg.camera.to_uppercase();
        let input_idx = match camera_to_input_idx.get(&cam_key) {
            Some(&idx) => idx,
            None => {
                return Err(format!(
                    "Timeline clip references Camera '{}', but no media input was assigned for it.",
                    cam_key
                ))
            }
        };

        let start = seg.start_time;
        let end = seg.end_time;
        if end <= start {
            continue; // Skip invalid zero or negative duration cuts
        }

        let idx = valid_count;
        valid_count += 1;

        // Video trim & standardize to 1080p 30fps with SAR=1 and padding
        filter_script.push_str(&format!(
            "[{in_idx}:v]trim=start={start:.3}:end={end:.3},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{idx}];\n",
            in_idx = input_idx,
            start = start,
            end = end,
            idx = idx
        ));
        v_concat_labels.push_str(&format!("[v{}]", idx));

        // Audio trim if not locked to master mic
        if !use_master_audio {
            filter_script.push_str(&format!(
                "[{in_idx}:a]atrim=start={start:.3}:end={end:.3},asetpts=PTS-STARTPTS[a{idx}];\n",
                in_idx = input_idx,
                start = start,
                end = end,
                idx = idx
            ));
            a_concat_labels.push_str(&format!("[a{}]", idx));
        }
    }

    if valid_count == 0 {
        return Err("All timeline segments had zero or negative duration.".to_string());
    }

    if use_master_audio {
        filter_script.push_str(&format!(
            "{v_labels}concat=n={count}:v=1:a=0[outv]\n",
            v_labels = v_concat_labels,
            count = valid_count
        ));
    } else {
        filter_script.push_str(&format!(
            "{v_labels}{a_labels}concat=n={count}:v=1:a=1[outv][outa]\n",
            v_labels = v_concat_labels,
            a_labels = a_concat_labels,
            count = valid_count
        ));
    }

    Ok(filter_script)
}

/// Executes FFmpeg export with waterfall hardware acceleration (Intel QSV -> Media Foundation -> NVENC -> CPU libx264)
#[tauri::command]
async fn export_multicam_video(
    segments: Vec<ClipSegment>,
    inputs: MulticamInputs,
    output_path: String,
    audio_mastering: Option<AudioMasteringProps>,
) -> Result<String, String> {
    println!("[PodFlow Engine - Intel x86_64] Starting multicam video export pipeline...");
    println!("[PodFlow Engine] Total segments: {}", segments.len());

    let mut sorted_segments = segments;
    sorted_segments.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap_or(std::cmp::Ordering::Equal));

    let mut camera_to_input_idx = HashMap::new();
    let mut input_files: Vec<String> = Vec::new();

    if !inputs.camera_a.trim().is_empty() {
        camera_to_input_idx.insert("A".to_string(), input_files.len());
        input_files.push(inputs.camera_a.clone());
    }
    if !inputs.camera_b.trim().is_empty() {
        camera_to_input_idx.insert("B".to_string(), input_files.len());
        input_files.push(inputs.camera_b.clone());
    }
    if !inputs.camera_c.trim().is_empty() {
        camera_to_input_idx.insert("C".to_string(), input_files.len());
        input_files.push(inputs.camera_c.clone());
    }

    if input_files.is_empty() {
        return Err("No video input files provided. Please import at least Camera A.".to_string());
    }

    let master_cam = inputs.master_audio_camera.as_deref().unwrap_or("A").to_uppercase();
    let master_audio_idx = camera_to_input_idx.get(&master_cam).copied().unwrap_or(0);
    let use_master_audio = inputs.master_audio_camera.is_some();

    let filtergraph_content = build_filtergraph_script(&sorted_segments, &camera_to_input_idx, use_master_audio)?;

    let temp_dir = std::env::temp_dir();
    let filter_script_path = temp_dir.join(format!("podflow_filter_{}.txt", uuid::Uuid::new_v4()));

    {
        let mut script_file = File::create(&filter_script_path)
            .map_err(|e| format!("Failed to create temporary filter script file: {}", e))?;
        script_file
            .write_all(filtergraph_content.as_bytes())
            .map_err(|e| format!("Failed to write to filter script: {}", e))?;
    }

    let final_output_path = if output_path.contains("C:\\Users\\Podcast") || output_path.trim().is_empty() {
        let cur = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let out_dir = cur.join("output");
        let _ = fs::create_dir_all(&out_dir);
        out_dir.join("podflow_export.mp4").to_string_lossy().to_string()
    } else {
        if let Some(parent) = Path::new(&output_path).parent() {
            if !parent.as_os_str().is_empty() && !parent.exists() {
                let _ = fs::create_dir_all(parent);
            }
        }
        output_path.clone()
    };

    struct EncoderConfig {
        name: &'static str,
        video_args: Vec<&'static str>,
    }

    let encoder_candidates = vec![
        EncoderConfig {
            name: "Intel Quick Sync Video (h264_qsv)",
            video_args: vec!["-c:v", "h264_qsv", "-b:v", "12M", "-preset", "veryfast", "-look_ahead", "0"],
        },
        EncoderConfig {
            name: "Windows Media Foundation (h264_mf)",
            video_args: vec!["-c:v", "h264_mf", "-b:v", "12M", "-quality", "quality"],
        },
        EncoderConfig {
            name: "NVIDIA NVENC (h264_nvenc)",
            video_args: vec!["-c:v", "h264_nvenc", "-b:v", "12M", "-preset", "p4"],
        },
        EncoderConfig {
            name: "Intel CPU Software Encoder (libx264 AVX2)",
            video_args: vec!["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-threads", "0"],
        },
    ];

    let mut successful_encoder = None;
    let mut last_error_log = String::new();

    for candidate in encoder_candidates.iter() {
        let mut cmd = Command::new("ffmpeg");

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.arg("-y");

        for file_path in &input_files {
            cmd.arg("-i").arg(file_path);
        }

        cmd.arg("-filter_complex_script").arg(&filter_script_path);

        cmd.arg("-map").arg("[outv]");
        if use_master_audio {
            cmd.arg("-map").arg(format!("{}:a", master_audio_idx));
        } else {
            cmd.arg("-map").arg("[outa]");
        }

        for arg in &candidate.video_args {
            cmd.arg(arg);
        }

        if let Some(ref am) = audio_mastering {
            let mut af_filters = Vec::new();
            if am.enable_high_pass_rumble {
                af_filters.push("highpass=f=80".to_string());
            }
            if am.enable_auto_leveler {
                af_filters.push("acompressor=threshold=-21dB:ratio=3.5:attack=5:release=50".to_string());
            }
            if am.enable_de_esser {
                af_filters.push("equalizer=f=6000:width_type=h:width=2000:g=-6".to_string());
            }
            if am.enable_de_plosive {
                af_filters.push("highpass=f=60".to_string());
            }
            if am.enable_loudness_norm {
                af_filters.push(format!("loudnorm=I={}:TP=-1.0:LRA=11", am.target_lufs));
            }
            if !af_filters.is_empty() {
                cmd.arg("-af").arg(af_filters.join(","));
            }
        }

        cmd.arg("-c:a").arg("aac")
           .arg("-b:a").arg("192k")
           .arg("-pix_fmt").arg("yuv420p")
           .arg("-movflags").arg("+faststart")
           .arg(&final_output_path);

        match cmd.output() {
            Ok(output) => {
                if output.status.success() {
                    successful_encoder = Some(candidate.name);
                    break;
                } else {
                    let err = String::from_utf8_lossy(&output.stderr);
                    last_error_log = err.to_string();
                }
            }
            Err(e) => {
                last_error_log = e.to_string();
            }
        }
    }

    let _ = fs::remove_file(&filter_script_path);

    if let Some(encoder) = successful_encoder {
        let msg = format!(
            "影片匯出成功！\n輸出路徑: {}\n編碼器: {}\n剪輯片段數: {}",
            final_output_path, encoder, sorted_segments.len()
        );
        println!("[PodFlow Engine] {}", msg);
        Ok(msg)
    } else {
        let err_msg = format!(
            "FFmpeg 導出失敗。請確認系統已安裝 FFmpeg 並已加入 PATH 環境變數。\n詳細日誌:\n{}",
            last_error_log
        );
        eprintln!("[PodFlow Engine] {}", err_msg);
        Err(err_msg)
    }
}

/// Executes audio waveform cross-correlation alignment via audio_align.py
#[tauri::command]
async fn align_multicam_audio(
    camera_a: String,
    camera_b: String,
    camera_c: String,
) -> Result<serde_json::Value, String> {
    let py_bin = if Command::new("python").arg("--version").output().is_ok() {
        "python"
    } else if Command::new("py").arg("--version").output().is_ok() {
        "py"
    } else {
        "python3"
    };

    let mut cmd = Command::new(py_bin);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.arg("audio_align.py")
       .arg(&camera_a)
       .arg(&camera_b)
       .arg(&camera_c);

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if output.status.success() {
                serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse alignment output ({}): {}", stdout, e))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    Ok(val)
                } else {
                    Err(format!("Audio align script failed:\n{}", stderr))
                }
            }
        }
        Err(e) => Err(format!("Failed to execute python '{}': {}. Please ensure Python 3 is installed.", py_bin, e))
    }
}

/// Executes real AI Auto MultiCam Director pipeline (VAD + Speaker Activity Tracking + FFmpeg Render)
#[tauri::command]
async fn run_auto_director(
    audio: String,
    cam_a: String,
    cam_b: String,
    cam_c: Option<String>,
    output_path: String,
    pacing: Option<String>,
) -> Result<serde_json::Value, String> {
    println!("[PodFlow Engine] Launching AI Auto Multi-Camera Director pipeline (3 Cam + 1 Audio)...");
    let py_bin = if Command::new("python").arg("--version").output().is_ok() {
        "python"
    } else if Command::new("py").arg("--version").output().is_ok() {
        "py"
    } else {
        "python3"
    };

    let mut cmd = Command::new(py_bin);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.arg("auto_director.py")
       .arg("--audio").arg(&audio)
       .arg("--cam_a").arg(&cam_a)
       .arg("--cam_b").arg(&cam_b);

    if let Some(ref c) = cam_c {
        if !c.trim().is_empty() {
            cmd.arg("--cam_c").arg(c);
        }
    }

    if !output_path.trim().is_empty() {
        cmd.arg("--output").arg(&output_path);
    }

    if let Some(ref p) = pacing {
        cmd.arg("--pacing").arg(p);
    }

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            if output.status.success() {
                Ok(serde_json::json!({
                    "status": "success",
                    "stdout": stdout,
                    "output_path": output_path
                }))
            } else {
                Err(format!("Auto Director execution failed:\n{}\n{}", stdout, stderr))
            }
        }
        Err(e) => Err(format!("Failed to spawn python auto_director.py: {}. Please ensure Python is installed.", e))
    }
}

/// Detects Intel CPU, GPU hardware acceleration, and system specs
#[tauri::command]
async fn get_system_hardware_info() -> Result<SystemHardwareInfo, String> {
    let arch = std::env::consts::ARCH.to_string();
    let os = std::env::consts::OS.to_string();
    let cpu_cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    let is_intel_x64 = arch == "x86_64";

    let mut available_encoders = Vec::new();
    if let Ok(output) = Command::new("ffmpeg").arg("-encoders").output() {
        let text = String::from_utf8_lossy(&output.stdout);
        if text.contains("h264_qsv") {
            available_encoders.push("h264_qsv (Intel Quick Sync Video)".to_string());
        }
        if text.contains("h264_mf") {
            available_encoders.push("h264_mf (Windows Media Foundation)".to_string());
        }
        if text.contains("h264_nvenc") {
            available_encoders.push("h264_nvenc (NVIDIA NVENC)".to_string());
        }
        if text.contains("libx264") {
            available_encoders.push("libx264 (Intel CPU AVX2/AVX-512)".to_string());
        }
    }

    let recommended = if available_encoders.iter().any(|e| e.contains("qsv")) {
        "Intel Quick Sync Video (h264_qsv)".to_string()
    } else if available_encoders.iter().any(|e| e.contains("mf")) {
        "Windows Media Foundation (h264_mf)".to_string()
    } else if available_encoders.iter().any(|e| e.contains("nvenc")) {
        "NVIDIA NVENC (h264_nvenc)".to_string()
    } else {
        "Intel CPU libx264 (AVX2 Multi-thread)".to_string()
    };

    Ok(SystemHardwareInfo {
        os,
        arch,
        cpu_cores,
        is_intel_x64,
        available_encoders,
        recommended_encoder: recommended,
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            export_multicam_video,
            align_multicam_audio,
            run_auto_director,
            get_system_hardware_info
        ])
        .run(tauri::generate_context!())
        .expect("Error while running PodFlow AI MultiCam application");
}
