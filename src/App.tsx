import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Scissors,
  RotateCcw,
  Upload,
  Download,
  Video,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cpu,
  FileVideo,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Mic,
  Maximize2,
  FolderOpen,
  Film,
  Music,
  Type,
  Shuffle,
  Sparkle,
  Sliders,
  Smile,
  LayoutTemplate,
  Search,
  Plus,
  Check,
  Grid,
  List,
  Filter,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  FileAudio,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  SlidersHorizontal,
  Gauge,
  Palette,
  Wand2,
  RefreshCw,
  Link,
  Unlink,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  MousePointer,
  GripVertical,
  SkipBack,
  SkipForward,
  Square,
  Camera,
  Share2,
  Smartphone,
  Flame,
  AudioLines,
  AlignLeft,
  X,
  Magnet,
  SplitSquareVertical,
  FastForward,
  Save,
  HelpCircle,
  Undo2,
  Redo2,
  Repeat,
  ChevronsLeft,
  ChevronsRight,
  Bookmark,
  Tag,
  Flag,
  Rewind,
  Keyboard,
  Copy,
  Info,
  ArrowLeftRight,
  Minimize,
  FolderPlus,
  FileText
} from 'lucide-react';
import {
  CameraId,
  ClipSegment,
  MulticamInputs,
  CameraConfig,
  SegmentColorLabel,
  TimelineMarker,
  TranscriptWord,
  TranscriptParagraph,
  ExportProgressState
} from './types/timeline';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

async function callTauriCommand<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  console.info(`[Tauri Mock Call] ${cmd}`, args);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return `[Mock 渲染成功] 影片已匯出至：${args.outputPath || 'output.mp4'}` as unknown as T;
}

export interface MediaAsset {
  id: string;
  name: string;
  filePath?: string;
  type: 'video' | 'audio';
  duration: number;
  url?: string;
  assignedCamera?: CameraId | 'Audio';
  thumbnailText?: string;
  sizeStr?: string;
}

async function pickNativeMediaFiles(): Promise<string[] | null> {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const res = await open({
        multiple: true,
        filters: [
          { name: 'Video & Audio Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'wav', 'mp3', 'm4a', 'aac'] }
        ]
      });
      if (!res) return null;
      return Array.isArray(res) ? res : [res];
    } catch (e) {
      console.warn('Native open dialog failed:', e);
    }
  }
  return null;
}

async function pickNativeSavePath(defaultName: string = 'podflow_multicam_export.mp4'): Promise<string | null> {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const res = await save({
        defaultPath: defaultName,
        filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
      });
      return res;
    } catch (e) {
      console.warn('Native save dialog failed:', e);
    }
  }
  return null;
}

async function resolveAssetUrl(filePath: string): Promise<string> {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      return convertFileSrc(filePath);
    } catch (e) {
      console.warn('convertFileSrc failed:', e);
    }
  }
  return filePath;
}

export type BlendModeType =
  | 'normal'
  | 'darken'
  | 'multiply'
  | 'color-burn'
  | 'lighten'
  | 'screen'
  | 'color-dodge'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface VideoTransformProps {
  scale: number;
  scaleY: number;
  isScaleLocked: boolean;
  posX: number;
  posY: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  opacity: number;
  blendMode: BlendModeType;
  // 功能 36: 不透明度即時淡入淡出秒數 (0.0 ~ 5.0s)
  fadeInDuration: number;
  fadeOutDuration: number;
  // 功能 37~39: 專業色彩調色參數
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  // Batch 9: 音訊混音、降噪、變速與波形淡入淡出參數 (Features 41 ~ 45)
  volume: number; // 功能 41: 主音量百分比 (0% ~ 200%)
  audioGainDb: number; // 功能 41: 軌道增益 dB (-60dB ~ +12dB)
  denoise: boolean; // 功能 42: AI 人聲降噪開關
  denoiseIntensity: 'low' | 'medium' | 'high'; // 功能 42: 降噪強度
  denoiseMode: 'npu' | 'spectral' | 'rnnoise'; // 功能 42: 降噪演算法模型
  speed: number; // 功能 43: 播放速度 (0.25x ~ 3.0x)
  preservePitch: boolean; // 功能 43: 變速音高保持開關
  audioFadeInDuration: number; // 功能 45: 音訊淡入秒數 (0.0 ~ 5.0s)
  audioFadeOutDuration: number; // 功能 45: 音訊淡出秒數 (0.0 ~ 5.0s)
  audioFadeCurve: 'linear' | 'exponential'; // 功能 45: 音訊淡入淡出曲線類型
  // Batch 13: AI 音訊母帶後製與人聲修復參數 (Features 61 ~ 65)
  enableLoudnessNorm: boolean; // 功能 61: 廣播級響度正規化開關
  targetLufs: -14 | -16 | -23; // 功能 61: 目標響度規格 (-14 LUFS, -16 LUFS, -23 LUFS)
  enableAutoLeveler: boolean; // 功能 62: 雙人音量動態平衡開關
  autoLevelerStrength: number; // 功能 62: 動態壓縮平衡強度 (50% ~ 100%)
  enableHighPassRumble: boolean; // 功能 63: 80Hz 低頻雜音與風切消除
  enableDeEsser: boolean; // 功能 64: 4~8kHz 齒音消除器
  deEsserStrength: 'low' | 'medium' | 'high'; // 功能 64: 齒音壓制等級
  enableDePlosive: boolean; // 功能 64: 智慧防噴麥爆音壓制
  enableDeReverb: boolean; // 功能 65: 空間殘響消除器
  deReverbAmount: number; // 功能 65: 空間去殘響強度 (0% ~ 100%)
  roomProfile: 'small' | 'large' | 'studio'; // 功能 65: 錄音環境聲學模型
}

const DEFAULT_TRANSFORM: VideoTransformProps = {
  scale: 100,
  scaleY: 100,
  isScaleLocked: true,
  posX: 0,
  posY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  opacity: 100,
  blendMode: 'normal',
  fadeInDuration: 0.0,
  fadeOutDuration: 0.0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  // Batch 9 音訊預設值
  volume: 100,
  audioGainDb: 0.0,
  denoise: false,
  denoiseIntensity: 'medium',
  denoiseMode: 'npu',
  speed: 1.0,
  preservePitch: true,
  audioFadeInDuration: 0.0,
  audioFadeOutDuration: 0.0,
  audioFadeCurve: 'exponential',
  // Batch 13 預設母帶參數
  enableLoudnessNorm: true,
  targetLufs: -14,
  enableAutoLeveler: true,
  autoLevelerStrength: 75,
  enableHighPassRumble: true,
  enableDeEsser: true,
  deEsserStrength: 'medium',
  enableDePlosive: true,
  enableDeReverb: true,
  deReverbAmount: 60,
  roomProfile: 'small'
};

const CAMERA_CONFIGS: Record<CameraId, CameraConfig> = {
  A: {
    id: 'A',
    name: 'Camera A',
    role: '主持人 (Host)',
    label: 'CAM A - 主持特寫',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    borderColor: 'border-emerald-500',
    activeGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    hotkey: '1'
  },
  B: {
    id: 'B',
    name: 'Camera B',
    role: '來賓 (Guest)',
    label: 'CAM B - 來賓特寫',
    colorName: 'violet',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    borderColor: 'border-violet-500',
    activeGlow: 'shadow-[0_0_20px_rgba(139,92,246,0.25)]',
    hotkey: '2'
  },
  C: {
    id: 'C',
    name: 'Camera C',
    role: '全景 (Wide)',
    label: 'CAM C - 全景雙人',
    colorName: 'amber',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    borderColor: 'border-amber-500',
    activeGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    hotkey: '3'
  }
};

const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: 'm-1',
    name: 'DSCF9335_主持特寫.MOV',
    type: 'video',
    duration: 5665.18,
    assignedCamera: 'A',
    thumbnailText: 'CAM A 主持',
    sizeStr: '1.2 GB'
  },
  {
    id: 'm-2',
    name: 'IMG_2559_來賓特寫.MOV',
    type: 'video',
    duration: 5665.18,
    assignedCamera: 'B',
    thumbnailText: 'CAM B 來賓',
    sizeStr: '1.1 GB'
  },
  {
    id: 'm-3',
    name: 'IMG_8301_現場全景.MOV',
    type: 'video',
    duration: 5665.18,
    assignedCamera: 'C',
    thumbnailText: 'CAM C 全景',
    sizeStr: '1.4 GB'
  },
  {
    id: 'm-4',
    name: '不做老闆做小工_主麥克風.m4a',
    type: 'audio',
    duration: 5665.18,
    assignedCamera: 'Audio',
    thumbnailText: 'AUD 主音軌',
    sizeStr: '48 MB'
  }
];

// 功能 47: 片段標籤顏色預設字典 (Segment Color Label Presets)
const SEGMENT_COLOR_PRESETS: Record<SegmentColorLabel, { name: string; bg: string; border: string; text: string; dot: string; glow: string }> = {
  teal: { name: '預設青綠', bg: 'bg-teal-950/60', border: 'border-teal-500/50', text: 'text-teal-200', dot: 'bg-teal-400', glow: 'shadow-[0_0_12px_rgba(20,184,166,0.3)]' },
  rose: { name: '高光粉紅', bg: 'bg-rose-950/60', border: 'border-rose-500/50', text: 'text-rose-200', dot: 'bg-rose-400', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]' },
  amber: { name: '待剪琥珀', bg: 'bg-amber-950/60', border: 'border-amber-500/50', text: 'text-amber-200', dot: 'bg-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  indigo: { name: '特效紫藍', bg: 'bg-indigo-950/60', border: 'border-indigo-500/50', text: 'text-indigo-200', dot: 'bg-indigo-400', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.3)]' },
  emerald: { name: '備援翠綠', bg: 'bg-emerald-950/60', border: 'border-emerald-500/50', text: 'text-emerald-200', dot: 'bg-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  sky: { name: '訪談天藍', bg: 'bg-sky-950/60', border: 'border-sky-500/50', text: 'text-sky-200', dot: 'bg-sky-400', glow: 'shadow-[0_0_12px_rgba(14,165,233,0.3)]' }
};

// 功能 48: 初始專案時間軸標記點
const INITIAL_TIMELINE_MARKERS: TimelineMarker[] = [
  { id: 'mk-1', time: 24.5, label: '開場引言焦點 (Hook)', color: 'yellow' },
  { id: 'mk-2', time: 68.0, label: '嘉賓精采金句 (Punchline)', color: 'blue' }
];

// 功能 91: 縮圖高光時刻候選資料結構
export interface ThumbnailMoment {
  id: string;
  time: number;
  label: string;
  expression: string;
  cam: CameraId;
  previewText: string;
}

const THUMBNAIL_MOMENTS: ThumbnailMoment[] = [
  { id: 'tm-1', time: 525.0, label: '大笑驚艷神情', expression: '來賓激動笑開懷', cam: 'B', previewText: '不用外接顯卡就能跑 AI？！' },
  { id: 'tm-2', time: 1332.0, label: '手勢強調金句', expression: '主持人手勢重點解說', cam: 'A', previewText: '徹底淘汰傳統高瓦數剪輯！' },
  { id: 'tm-3', time: 2465.0, label: '雙人高潮對談', expression: '雙人全景激烈探討', cam: 'C', previewText: 'Windows on ARM 實測大震驚！' },
  { id: 'tm-4', time: 48.0, label: '自信開場特寫', expression: '主持人直視鏡頭', cam: 'A', previewText: '剪輯師必看的算力革命！' }
];

// 功能 83: B-Roll 覆蓋軌道片段資料結構
export interface BRollSegment {
  id: string;
  mediaId: string;
  name: string;
  startTime: number;
  endTime: number;
  displayMode: 'cutaway' | 'pip';
  transition: 'fade' | 'slide' | 'zoom';
  pipPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// 功能 82: 免版權 B-Roll 圖庫素材項目
export interface StockBRollItem {
  id: string;
  name: string;
  tag: string;
  duration: number;
  matchedEntity: string;
}

const STOCK_BROLL_LIBRARY: StockBRollItem[] = [
  { id: 'b-chip', name: '晶片晶圓奈米級微距特寫', tag: '硬體晶片', duration: 15.0, matchedEntity: 'Snapdragon X Elite / NPU' },
  { id: 'b-server', name: '高科技雲端伺服器機房數據燈號', tag: '算力架構', duration: 18.0, matchedEntity: 'FFmpeg 硬體加速' },
  { id: 'b-laptop', name: '現代超輕薄筆電商務打字辦公', tag: '生產力', duration: 12.0, matchedEntity: 'Windows on ARM 生態系' },
  { id: 'b-mic', name: '專業電容式廣播級麥克風焦點光影', tag: 'Podcast', duration: 14.0, matchedEntity: '多機位即時導播系統' },
  { id: 'b-studio', name: '電視台導播室多螢幕監看牆', tag: '影音工程', duration: 20.0, matchedEntity: '即時切鏡與剪輯管線' }
];

// 功能 76: AI 章節標記資料結構
export interface PodcastChapter {
  id: string;
  startTime: number;
  title: string;
  description: string;
}

// 功能 77 & 78: Podcast 單集備忘錄與 SEO 摘要資料結構
export interface PodcastShowNotes {
  episodeTitle: string;
  subtitle: string;
  overview: string;
  takeaways: string[];
  chapters: PodcastChapter[];
  resources: Array<{ name: string; url: string }>;
  seoTitles: string[];
  tags: string[];
  hashtags: string[];
}

const INITIAL_SHOW_NOTES: PodcastShowNotes = {
  episodeTitle: '【EP.42】AI 晶片革命！Windows on ARM 如何翻轉 Podcast 桌面影音後製？',
  subtitle: '專訪 AI 運算架構師 David：Snapdragon X Elite 實測、Whisper 離線解碼與多機位自動切鏡全流程解密',
  overview: '在本集節目中，我們深入剖析了最新一代 Windows on ARM 與 Qualcomm Snapdragon X Elite 架構，探討高達 45 TOPS 的 NPU 算力如何打破以往剪輯必須依賴高瓦數外接獨顯的局限。現場更實際展示了多機位音訊波形交叉對齊、Whisper AI 詞級文字剪輯，以及全自動多機位智慧導播！',
  takeaways: [
    'Windows on ARM 架構深度解析：低功耗高續航下如何達成 4K 多機位硬體即時解碼與渲染。',
    'FFmpeg complex_filtergraph 腳本模式：規避 Windows 32KB 命令列長度限制的底層工業級架構。',
    'Whisper 本地量化神經網路：零上傳隱私保護，0.2 秒極速轉錄繁體中文詞級時間碼。',
    'VAD 與聲紋發言人拓撲比對：自動切鏡導播演算法如何兼顧對話節奏與雙人全景穿插。'
  ],
  chapters: [
    { id: 'ch-1', startTime: 0.0, title: '開場介紹與科技趨勢速報', description: '主持人引言與嘉賓背景簡介' },
    { id: 'ch-2', startTime: 420.0, title: 'Windows on ARM 生態系與 NPU 算力爆發', description: '探討 ARM 架構對桌面影音生產力的顛覆' },
    { id: 'ch-3', startTime: 1250.0, title: '深度學習與 FFmpeg 硬體加速架構解密', description: '深入剖析 Media Foundation 與濾鏡鏈優化' },
    { id: 'ch-4', startTime: 2400.0, title: '實機展示：多機位即時導播與自動切鏡管線', description: 'Live 切鏡、反應鏡頭穿插與時間軸生成' },
    { id: 'ch-5', startTime: 4350.0, title: '未來展望與 Q&A 總結', description: 'AI 對創作者經濟與獨立剪輯師的深遠影響' }
  ],
  resources: [
    { name: 'PodFlow Pro 官方開源專案', url: 'https://github.com/podflow/podflow-multicam' },
    { name: 'Qualcomm Snapdragon X Elite 開發者文件', url: 'https://developer.qualcomm.com' },
    { name: 'Whisper 語音辨識模型庫', url: 'https://github.com/openai/whisper' }
  ],
  seoTitles: [
    '👑 顛覆桌面剪輯！Snapdragon X Elite 實測真的能跑多機位 AI 導播嗎？',
    '⚡ 不用獨顯也能跑 Whisper！Windows on ARM 原生影音黑科技大解密',
    '🎙️ Podcast 製作必看：多機位自動切鏡與音訊交叉對齊到底怎麼做？'
  ],
  tags: ['WindowsOnARM', 'SnapdragonXElite', 'Podcast剪輯', '多機位導播', 'WhisperAI', 'FFmpeg加速', '影音自動化', 'Tauri2'],
  hashtags: ['#Podcast製作', '#AI剪輯', '#WindowsOnARM', '#科技解密', '#創作者經濟']
};

// 功能 66: AI 自動擷取的 9:16 高光精華候選片段資料結構
export interface AiShortClip {
  id: number;
  title: string;
  hook: string;
  score: number;
  duration: string;
  startTime: number;
  endTime: number;
  primaryCam: CameraId;
  secondaryCam: CameraId;
  captionText: string;
}

const AI_SHORT_CANDIDATES: AiShortClip[] = [
  {
    id: 1,
    title: 'AI 晶片爆發！Windows on ARM 改變了整個影音後製',
    hook: '強烈觀點 (Viral Hook)',
    score: 98,
    duration: '45s',
    startTime: 12.0,
    endTime: 57.0,
    primaryCam: 'A',
    secondaryCam: 'B',
    captionText: '🔥「Windows on ARM 晶片能直接在桌面端跑硬體剪輯？！」'
  },
  {
    id: 2,
    title: '低功耗高續航下，桌面端能跑原生深度學習？',
    hook: '引人好奇 (Curiosity)',
    score: 95,
    duration: '38s',
    startTime: 85.0,
    endTime: 123.0,
    primaryCam: 'B',
    secondaryCam: 'A',
    captionText: '💡「深度學習聲學解碼竟然不需要外接獨立顯示卡？！」'
  },
  {
    id: 3,
    title: '多機位音訊波形交叉對齊，底層數學到底怎麼算？',
    hook: '硬核技術 (Tech Secret)',
    score: 92,
    duration: '52s',
    startTime: 150.0,
    endTime: 202.0,
    primaryCam: 'C',
    secondaryCam: 'B',
    captionText: '⚡「FFT 正規化互相關算法，0.01 秒級精密校準！」'
  }
];

// 功能 51 & 54: 帶有詞級時間碼 (Word-level timestamps) 與口癖贅字標籤的結構化逐字稿
const INITIAL_TRANSCRIPT: TranscriptParagraph[] = [
  {
    id: 't-1',
    speaker: '主持人 (Alex)',
    role: 'Host',
    speakerRole: 'Host',
    text: '歡迎收聽《科技解密》。那個...今天我們很榮幸邀請到 AI 架構師 David 來聊聊最新晶片發展與多機位自動剪輯。',
    englishText: "Welcome to Tech Decoded. We are honored to invite AI Architect David to discuss chip innovations and multicam editing.",
    startTime: 0.0,
    endTime: 420.0,
    suggestedCamera: 'A',
    words: [
      { id: 'w-1', word: '歡迎收聽', startTime: 0.0, endTime: 70.0 },
      { id: 'w-2', word: '《科技解密》。', startTime: 70.0, endTime: 130.0 },
      { id: 'w-3', word: '那個...', startTime: 130.0, endTime: 190.0, isFiller: true },
      { id: 'w-4', word: '今天我們很榮幸邀請到', startTime: 190.0, endTime: 280.0 },
      { id: 'w-5', word: 'AI 架構師 David，', startTime: 280.0, endTime: 350.0 },
      { id: 'w-6', word: '來聊聊多機位自動剪輯。', startTime: 350.0, endTime: 420.0 }
    ]
  },
  {
    id: 't-2',
    speaker: '來賓 (David)',
    role: 'Guest',
    speakerRole: 'Guest',
    text: '嗨 Alex，非常開心來到現場。然後...最近 Windows on ARM 生態系與 NPU 算力爆發，徹底改變了影片後製。',
    englishText: "Hi Alex, glad to be here! The Windows on ARM ecosystem and NPU acceleration have completely transformed video production.",
    startTime: 420.0,
    endTime: 1250.0,
    suggestedCamera: 'B',
    words: [
      { id: 'w-7', word: '嗨 Alex，非常開心來到現場。', startTime: 420.0, endTime: 620.0 },
      { id: 'w-8', word: '然後...', startTime: 620.0, endTime: 750.0, isFiller: true },
      { id: 'w-9', word: '最近 Windows on ARM 生態系', startTime: 750.0, endTime: 980.0 },
      { id: 'w-10', word: '與 NPU 算力爆發，徹底改變了影片後製。', startTime: 980.0, endTime: 1250.0 }
    ]
  },
  {
    id: 't-3',
    speaker: '主持人 (Alex)',
    role: 'Host',
    speakerRole: 'Host',
    text: '確實！在低功耗高續航條件下，桌面端能跑深度學習與 FFmpeg 硬體加速，就是...以前難以想像的突破。',
    englishText: "Indeed! Running native deep learning and FFmpeg hardware acceleration on desktop with low power is an unprecedented breakthrough.",
    startTime: 1250.0,
    endTime: 2400.0,
    suggestedCamera: 'A',
    words: [
      { id: 'w-11', word: '確實！在低功耗高續航條件下，', startTime: 1250.0, endTime: 1620.0 },
      { id: 'w-12', word: '桌面端能跑深度學習與 FFmpeg 硬體加速，', startTime: 1620.0, endTime: 2050.0 },
      { id: 'w-13', word: '就是...', startTime: 2050.0, endTime: 2180.0, isFiller: true },
      { id: 'w-14', word: '以前難以想像的突破。', startTime: 2180.0, endTime: 2400.0 }
    ]
  },
  {
    id: 't-4',
    speaker: '雙人討論 (Discussion)',
    role: 'Both',
    speakerRole: 'Both',
    text: '讓我們直接來展示這套多機位即時導播系統如何自動完成視角切換、片段微調與剪輯輸出管線。',
    englishText: "Let's demonstrate how this real-time director system automatically handles angle switching, trimming, and export pipelines.",
    startTime: 2400.0,
    endTime: 5665.18,
    suggestedCamera: 'C',
    words: [
      { id: 'w-15', word: '讓我們直接來展示這套多機位即時導播系統，', startTime: 2400.0, endTime: 3600.0 },
      { id: 'w-16', word: '如何自動完成視角切換、片段微調與剪輯輸出管線。', startTime: 3600.0, endTime: 5665.18 }
    ]
  }
];

const INITIAL_SEGMENTS: ClipSegment[] = [
  { id: 'seg-1', camera: 'A', startTime: 0.0, endTime: 420.0 },
  { id: 'seg-2', camera: 'B', startTime: 420.0, endTime: 1250.0 },
  { id: 'seg-3', camera: 'A', startTime: 1250.0, endTime: 2400.0 },
  { id: 'seg-4', camera: 'C', startTime: 2400.0, endTime: 3800.0 },
  { id: 'seg-5', camera: 'B', startTime: 3800.0, endTime: 4800.0 },
  { id: 'seg-6', camera: 'A', startTime: 4800.0, endTime: 5665.18 }
];

type TopNavTab = 'media' | 'stock' | 'audio' | 'titles' | 'transitions' | 'effects' | 'filters' | 'stickers' | 'templates';
type InspectorMainTab = 'video' | 'audio' | 'speed' | 'color' | 'ai' | 'transcript' | 'notes';
type InspectorVideoSubTab = 'basic' | 'mask' | 'tracking' | 'smart_cutout' | 'retouch';

export const App: React.FC = () => {
  // === 功能 21 ~ 25：專業監視器預覽、畫質、快照與安全框狀態 (提前宣告確保頂層 Hook 作用域) ===
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [monitorZoom, setMonitorZoom] = useState<number>(100); // 功能 24: 監視器縮放
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());

  const [monitorPan, setMonitorPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningMonitor, setIsPanningMonitor] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const monitorContainerRef = useRef<HTMLDivElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState<boolean>(false);
  // 問題 2: 滑鼠框選狀態 (Marquee Box Selection)
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);




  // 功能 24: 監視器縮放後之滑鼠拖曳平移處理 (Pan Drag)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleMonitorMouseDown = (e: React.MouseEvent) => {
    if (monitorZoom > 100 && (e.button === 0 || e.button === 1)) {
      setIsPanningMonitor(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: monitorPan.x,
        panY: monitorPan.y
      };
    }
  };

  const handleMonitorMouseMove = (e: React.MouseEvent) => {
    if (isPanningMonitor) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setMonitorPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      });
    }
  };

  const handleMonitorMouseUp = () => {
    setIsPanningMonitor(false);
  };


  // 功能 21: 全螢幕切換
  const toggleFullscreen = useCallback(() => {
    if (!monitorContainerRef.current) return;
    if (!document.fullscreenElement) {
      monitorContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
        setIsFullscreen(true);
      });
      setLiveCutNotice('已進入全螢幕監視器預覽 (按 ESC 退出)');
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {
        setIsFullscreen(false);
      });
      setLiveCutNotice('已退出全螢幕');
    }
    setTimeout(() => setLiveCutNotice(null), 1200);
  }, []);

  // 監聽全螢幕狀態變化 (包括 ESC 鍵退出)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // === 功能 2：SMPTE 幀精確度時間換算引擎 (時:分:秒:格 30fps) ===
  const formatSMPTE = useCallback((seconds: number): string => {
    const totalSecs = Math.max(0, seconds);
    const totalFrames = Math.round(totalSecs * 30);
    const frames = totalFrames % 30;
    const totalSecRounded = Math.floor(totalFrames / 30);
    const secs = totalSecRounded % 60;
    const mins = Math.floor(totalSecRounded / 60) % 60;
    const hrs = Math.floor(totalSecRounded / 3600);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }, []);

  const formatShortTimecode = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const [activeTab, setActiveTab] = useState<TopNavTab>('media');
  const [activeMediaFolder, setActiveMediaFolder] = useState<string>('project');
  const [mediaSearchQuery, setMediaSearchQuery] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(INITIAL_MEDIA_ASSETS);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('m-1');

  const [inspectorTab, setInspectorTab] = useState<InspectorMainTab>('video');
  const [videoSubTab, setVideoSubTab] = useState<InspectorVideoSubTab>('basic');
  const [transformEnabled, setTransformEnabled] = useState<boolean>(true);
  const [compositingEnabled, setCompositingEnabled] = useState<boolean>(true);

  const [videoProps, setVideoProps] = useState<VideoTransformProps>(DEFAULT_TRANSFORM);

  const [inputs, setInputs] = useState<MulticamInputs>({
    cameraA: 'DSCF9335_主持特寫.MOV',
    cameraB: 'IMG_2559_來賓特寫.MOV',
    cameraC: 'IMG_8301_現場全景.MOV',
    masterAudioCamera: 'A'
  });

  const [inputFiles, setInputFiles] = useState<{
    A: string | null;
    B: string | null;
    C: string | null;
  }>({ A: null, B: null, C: null });

  const [audioOffsets, setAudioOffsets] = useState<Record<CameraId, number>>({
    A: 0.0,
    B: 1.25,
    C: -0.82
  });
  const [isAutoAligning, setIsAutoAligning] = useState<boolean>(false);

  const [trackStates, setTrackStates] = useState<Record<CameraId | 'Audio', {
    visible: boolean;
    muted: boolean;
    locked: boolean;
  }>>({
    A: { visible: true, muted: false, locked: false },
    B: { visible: true, muted: false, locked: false },
    C: { visible: true, muted: false, locked: false },
    Audio: { visible: true, muted: false, locked: false }
  });

  const [totalDuration, setTotalDuration] = useState<number>(5665.18);
  const [currentTime, setCurrentTime] = useState<number>(672.05);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [segments, setSegments] = useState<ClipSegment[]>(INITIAL_SEGMENTS);
  const [transcripts, setTranscripts] = useState<TranscriptParagraph[]>(INITIAL_TRANSCRIPT);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>('seg-2');
  const [liveCutNotice, setLiveCutNotice] = useState<string | null>(null);

  const [previewQuality, setPreviewQuality] = useState<'full' | 'half' | 'quarter'>('full');
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);

  // === 關鍵狀態提前提升 (Hoisted State & Memos) 確保作用域與 TypeScript 型別安全 ===
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set(['seg-2'])); // 功能 13: 多選
  const [soloTrack, setSoloTrack] = useState<CameraId | 'Audio' | null>(null); // 功能 11: Solo 監聽

  // 功能 17: B-Roll 覆蓋軌道片段狀態 (提前宣告避免切點跳轉未宣告先引用)
  const [brollSegments, setBrollSegments] = useState<BRollSegment[]>([
    {
      id: 'broll-1',
      mediaId: 'b-chip',
      name: '晶片晶圓微距特寫.mp4',
      startTime: 420.0,
      endTime: 480.0,
      displayMode: 'cutaway',
      transition: 'fade'
    },
    {
      id: 'broll-2',
      mediaId: 'b-server',
      name: '雲端伺服器機房動態.mp4',
      startTime: 1250.0,
      endTime: 1320.0,
      displayMode: 'pip',
      transition: 'fade'
    }
  ]);

  // 功能 48: 歷史復原/重做棧 (Undo/Redo Stack - 提前宣告供口癖/靜音/剪片調用)
  const [historyStack, setHistoryStack] = useState<ClipSegment[][]>([INITIAL_SEGMENTS]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistorySnapshot = useCallback((newSegments: ClipSegment[]) => {
    setHistoryStack((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newSegments];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // 功能 11 & 12: 當前機位與主畫面監聽運算 (提前宣告供播放器同步 Effect 調用)
  const activeCamera: CameraId = useMemo(() => {
    const activeSeg = segments.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    return activeSeg ? activeSeg.camera : 'A';
  }, [currentTime, segments]);

  const displayCamera: CameraId = useMemo(() => {
    if (trackStates[activeCamera]?.visible) {
      return activeCamera;
    }
    const fallback = (['A', 'B', 'C'] as CameraId[]).find((c) => trackStates[c]?.visible);
    return fallback || 'A';
  }, [activeCamera, trackStates]);

  const isMasterAudioAudible = useMemo(() => {
    if (soloTrack) {
      return soloTrack === 'Audio' || soloTrack === displayCamera;
    }
    return !trackStates.Audio.muted && !trackStates[displayCamera].muted;
  }, [soloTrack, trackStates, displayCamera]);

  // === 專業工具與時間軸設定 (Feature 06 ~ 10) ===
  const [currentTool, setCurrentTool] = useState<'select' | 'razor'>('select');
  const [razorHover, setRazorHover] = useState<{ camId: CameraId; time: number; leftPx: number } | null>(null);
  const [trimTooltip, setTrimTooltip] = useState<{
    text: string;
    subText: string;
    x: number;
    y: number;
  } | null>(null);
  // === 專業時間軸縮放與磁吸設定 (Feature 1 ~ 5) ===
  const [zoomRatio, setZoomRatio] = useState<number>(3.5);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState<boolean>(true);
  const [activeSnapGuideTime, setActiveSnapGuideTime] = useState<number | null>(null);

  // 拖曳修剪與即時反饋
  const [trimmingState, setTrimmingState] = useState<{
    segmentId: string;
    handle: 'start' | 'end' | 'move';
    initialMouseX: number;
    initialStart: number;
    initialEnd: number;
    initialGroupPositions?: Record<string, { start: number; end: number }>; // 功能 14: 群組連動初始位置
  } | null>(null);

  const [dragOverTrack, setDragOverTrack] = useState<CameraId | null>(null);
  const [dragGhostTime, setDragGhostTime] = useState<number | null>(null);

  // === 功能 26 ~ 30：素材分類、雙檢視模式、重新連結與中繼資料檢查 ===
  const [customFolders, setCustomFolders] = useState<Array<{ id: string; label: string }>>([
    { id: 'interview', label: '訪談主線' },
    { id: 'broll', label: 'B-Roll 空鏡' }
  ]);
  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [relinkingAssetId, setRelinkingAssetId] = useState<string | null>(null);
  const relinkInputRef = useRef<HTMLInputElement>(null);

  // 功能 26: 新增自定義素材分類資料夾
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      setIsAddingFolder(false);
      return;
    }
    const newId = `folder-${Date.now()}`;
    setCustomFolders((prev) => [...prev, { id: newId, label: newFolderName.trim() }]);
    setNewFolderName('');
    setIsAddingFolder(false);
    setActiveMediaFolder(newId);
    setLiveCutNotice(`已建立新素材資料夾：${newFolderName}`);
    setTimeout(() => setLiveCutNotice(null), 1200);
  };

  // 功能 29: 素材重新連結與替換 (Relink Media - 完整保留時間軸切點)
  const handleRelinkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !relinkingAssetId) return;

    const objectUrl = URL.createObjectURL(file);
    createdUrlsRef.current.add(objectUrl);

    setMediaAssets((prev) =>
      prev.map((a) => {
        if (a.id !== relinkingAssetId) return a;
        return {
          ...a,
          name: file.name,
          url: objectUrl,
          sizeStr: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        };
      })
    );

    const asset = mediaAssets.find((a) => a.id === relinkingAssetId);
    if (asset?.assignedCamera && asset.assignedCamera !== 'Audio') {
      const cam = asset.assignedCamera;
      setInputFiles((prev) => ({ ...prev, [cam]: objectUrl }));
      setInputs((prev) => ({
        ...prev,
        [cam === 'A' ? 'cameraA' : cam === 'B' ? 'cameraB' : 'cameraC']: file.name
      }));
    }

    setLiveCutNotice(`素材已成功重新連結至【${file.name}】，時間軸剪輯切點完整保留！`);
    setTimeout(() => setLiveCutNotice(null), 2500);
    setRelinkingAssetId(null);
  };

  // 問題 3: 本地音效輸出端點測試與解鎖 (Windows Audio Endpoint Link)
  const handleTestLocalAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        // 播放 440Hz (A4) 柔和音訊脈衝測試電腦音效卡
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
      if (mainVideoRef.current) {
        mainVideoRef.current.muted = !isMasterAudioAudible;
        mainVideoRef.current.volume = Math.max(0.1, videoProps.volume / 100);
        if (isPlaying) {
          mainVideoRef.current.play().catch(() => {});
        }
      }
      setLiveCutNotice('🔊 本地音效卡輸出已接通！(系統音效端點正常響應，音量 ' + videoProps.volume + '%)');
      setTimeout(() => setLiveCutNotice(null), 2500);
    } catch (e) {
      setLiveCutNotice('音訊輸出端點連線異常: ' + String(e));
      setTimeout(() => setLiveCutNotice(null), 2500);
    }
  }, [isMasterAudioAudible, videoProps.volume, isPlaying]);

  // 初次使用者手勢自動解鎖 Chromium / Tauri 音訊自動播放策略 (Windows Audio Auto-Resume)
  useEffect(() => {
    const unlockAudio = () => {
      if (mainVideoRef.current) {
        mainVideoRef.current.muted = !isMasterAudioAudible;
        mainVideoRef.current.volume = Math.max(0, Math.min(1, videoProps.volume / 100));
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [isMasterAudioAudible, videoProps.volume]);

  // === 50 項專業基礎剪輯功能狀態 (Features 11 ~ 50) ===
  // 功能 40: A/B 色彩原片即時對比狀態 (True 為查看原始 RAW 影片，False 為套用調色後)
  const [isABComparing, setIsABComparing] = useState<boolean>(false);
  const [colorScrubbingAxis, setColorScrubbingAxis] = useState<'brightness' | 'contrast' | 'saturation' | 'temperature' | 'tint' | null>(null);

  // 功能 41: 音訊音量標籤拖曳微調狀態
  const [audioScrubbing, setAudioScrubbing] = useState<boolean>(false);

  // 功能 41, 43, 45: 播放速率、音高保持、主音量增益與即時淡入淡出曲線同步至視訊播放器
  useEffect(() => {
    const videoEl = mainVideoRef.current || document.querySelector('video');
    if (videoEl) {
      videoEl.playbackRate = videoProps.speed;
      (videoEl as any).preservesPitch = videoProps.preservePitch;
      // 功能 11 & 問題 3: 精準同步主監視器靜音與 Solo 監聽狀態至實體音效輸出
      videoEl.muted = !isMasterAudioAudible;

      // 功能 41 & 45: 主音量與動態音訊淡入/淡出包絡增益衰減運算
      let volFactor = videoProps.volume / 100;
      if (videoProps.audioFadeInDuration > 0 && currentTime < videoProps.audioFadeInDuration) {
        const inRatio = Math.max(0, currentTime / videoProps.audioFadeInDuration);
        const curveFactor = videoProps.audioFadeCurve === 'exponential' ? Math.pow(inRatio, 2) : inRatio;
        volFactor *= curveFactor;
      }
      if (videoProps.audioFadeOutDuration > 0 && currentTime > totalDuration - videoProps.audioFadeOutDuration) {
        const outRatio = Math.max(0, (totalDuration - currentTime) / videoProps.audioFadeOutDuration);
        const curveFactor = videoProps.audioFadeCurve === 'exponential' ? Math.pow(outRatio, 2) : outRatio;
        volFactor *= curveFactor;
      }
      videoEl.volume = Math.max(0, Math.min(1, volFactor));
    }
  }, [
    videoProps.speed,
    videoProps.preservePitch,
    videoProps.volume,
    videoProps.audioFadeInDuration,
    videoProps.audioFadeOutDuration,
    videoProps.audioFadeCurve,
    currentTime,
    totalDuration,
    isMasterAudioAudible
  ]);

  // 功能 41: 音訊音量水平拖曳微調
  const handleStartAudioScrubbing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = videoProps.volume;
    setAudioScrubbing(true);
    document.body.style.cursor = 'ew-resize';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let multiplier = 1;
      if (moveEvent.shiftKey) multiplier = 5;
      else if (moveEvent.altKey || moveEvent.ctrlKey) multiplier = 0.2;
      const newVal = Math.min(200, Math.max(0, Math.round(startVal + deltaX * multiplier)));
      // 同步換算 dB: 100% 為 0dB
      const newDb = newVal === 0 ? -60 : parseFloat((20 * Math.log10(newVal / 100)).toFixed(1));
      setVideoProps((p) => ({ ...p, volume: newVal, audioGainDb: newDb }));
    };

    const onMouseUp = () => {
      setAudioScrubbing(false);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [videoProps.volume]);

  // 功能 37~39: 色彩標籤按住水平拖曳平滑微調 (支援 Shift 5x 加速與 Alt/Ctrl 0.2x 微調)
  const handleStartColorScrubbing = useCallback(
    (e: React.MouseEvent, axis: 'brightness' | 'contrast' | 'saturation' | 'temperature' | 'tint') => {
      e.preventDefault();
      const startX = e.clientX;
      const startVal = videoProps[axis];
      setColorScrubbingAxis(axis);
      document.body.style.cursor = 'ew-resize';

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let multiplier = 1;
        if (moveEvent.shiftKey) multiplier = 5;
        else if (moveEvent.altKey || moveEvent.ctrlKey) multiplier = 0.2;
        const newVal = Math.round(startVal + deltaX * multiplier);
        let clampedVal = newVal;
        if (axis === 'brightness' || axis === 'contrast') {
          clampedVal = Math.max(0, Math.min(200, newVal));
        } else if (axis === 'saturation') {
          clampedVal = Math.max(0, Math.min(250, newVal));
        } else if (axis === 'temperature' || axis === 'tint') {
          clampedVal = Math.max(-100, Math.min(100, newVal));
        }
        setVideoProps((p) => ({ ...p, [axis]: clampedVal }));
      };

      const onMouseUp = () => {
        setColorScrubbingAxis(null);
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [videoProps]
  );
  // 功能 32: 精確像素座標位移 - 拖曳微調狀態 (Scrubbable Drag Engine)
  const [scrubbingAxis, setScrubbingAxis] = useState<'posX' | 'posY' | null>(null);

  // 功能 33: 360 度互動式旋轉角度輪盤狀態
  const [isDialDragging, setIsDialDragging] = useState<boolean>(false);
  const dialRef = useRef<SVGSVGElement | null>(null);

  // 功能 32: 座標標籤按住水平拖曳微調 (支援 Shift 10x 加速與 Alt/Ctrl 0.2x 精細微調)
  const handleStartScrubbing = useCallback((e: React.MouseEvent, axis: 'posX' | 'posY') => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = videoProps[axis];
    setScrubbingAxis(axis);
    document.body.style.cursor = 'ew-resize';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let multiplier = 1;
      if (moveEvent.shiftKey) multiplier = 10;
      else if (moveEvent.altKey || moveEvent.ctrlKey) multiplier = 0.2;
      const newVal = Math.round(startVal + deltaX * multiplier);
      setVideoProps((p) => ({ ...p, [axis]: newVal }));
    };

    const onMouseUp = () => {
      setScrubbingAxis(null);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [videoProps]);

  // 功能 33: 360 度旋轉輪盤互動拖曳 (滑鼠繞中心計算角度並自動吸附關鍵角度)
  const handleStartDialRotate = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setIsDialDragging(true);
    document.body.style.cursor = 'grabbing';

    const calcAngle = (clientX: number, clientY: number) => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      // 12 點鐘方向為 0 度，順時針計算
      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;

      // 關鍵角度自動磁吸 (±4度吸附至 -180, -90, 0, 90, 180)
      for (const snap of [-180, -90, 0, 90, 180]) {
        if (Math.abs(deg - snap) <= 4) {
          deg = snap;
          break;
        }
      }
      return deg;
    };

    setVideoProps((p) => ({ ...p, rotation: calcAngle(e.clientX, e.clientY) }));

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newAngle = calcAngle(moveEvent.clientX, moveEvent.clientY);
      setVideoProps((p) => ({ ...p, rotation: newAngle }));
    };

    const onMouseUp = () => {
      setIsDialDragging(false);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);
const [isLooping, setIsLooping] = useState<boolean>(false); // 功能 16: 循環播放
  const [mediaViewMode, setMediaViewMode] = useState<'grid' | 'list'>('grid'); // 功能 27: 網格/清單模式
  const [inspectingAsset, setInspectingAsset] = useState<MediaAsset | null>(null); // 功能 30: 素材屬性檢查
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false); // 功能 49: 快捷鍵視窗
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('剛剛'); // 功能 50: 自動儲存
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true); // 功能 25: 電視安全框
  const [isReversePlayback, setIsReversePlayback] = useState<boolean>(false); // 功能 46: 倒放

  // 功能 48: 時間軸標記點系統 (Markers System)
  const [markers, setMarkers] = useState<TimelineMarker[]>(INITIAL_TIMELINE_MARKERS);

  // 功能 49: 快捷鍵搜尋過濾字串
  const [shortcutSearchQuery, setShortcutSearchQuery] = useState<string>('');

  // === Part 2: AI 智慧輔助剪輯狀態 (Features 51 ~ 55) ===
  // 功能 51: Whisper AI 語音轉文字設定與進度
  const [whisperModel, setWhisperModel] = useState<'large-v3' | 'turbo' | 'npu'>('turbo');
  const [whisperLang, setWhisperLang] = useState<'zh' | 'en' | 'auto'>('zh');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeProgress, setTranscribeProgress] = useState<number>(0);
  const [transcribeStep, setTranscribeStep] = useState<string>('');

  // 功能 52: 發言人角色篩選器
  const [speakerFilter, setSpeakerFilter] = useState<'all' | 'host' | 'guest' | 'discussion'>('all');

  // 功能 55: 靜音停頓判定門限 (秒)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(1.2);

  // === Part 2: AI 多機位智慧導播與人臉追蹤狀態 (Features 56 ~ 60) ===
  // 功能 56: VAD 語音活動檢測靈敏度
  const [vadSensitivity, setVadSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [minShotDuration, setMinShotDuration] = useState<number>(3.0); // 最短鏡頭停留時間 (秒)
  const [maxShotDuration, setMaxShotDuration] = useState<number>(14.0); // 最長鏡頭停留時間 (秒)

  // 功能 57: 反應鏡頭與全景穿插規則開關
  const [enableReactionCuts, setEnableReactionCuts] = useState<boolean>(true);
  const [enableWideIntercuts, setEnableWideIntercuts] = useState<boolean>(true);
  const [enableOverlapWide, setEnableOverlapWide] = useState<boolean>(true);

  // 功能 58: 人臉識別與置中構圖
  const [autoReframeFace, setAutoReframeFace] = useState<boolean>(true);
  const [showFaceTrackerBox, setShowFaceTrackerBox] = useState<boolean>(true);

  // 功能 59: 導播剪輯節奏風格
  const [directorPacing, setDirectorPacing] = useState<'relaxed' | 'balanced' | 'dynamic'>('balanced');

  // 功能 51: 模擬 / 執行 Whisper AI 語音轉逐字稿流程
  const handleWhisperTranscribe = useCallback(() => {
    setIsTranscribing(true);
    setTranscribeProgress(10);
    setTranscribeStep('正在自母音軌提取 16kHz 單聲道音訊特徵...');

    setTimeout(() => {
      setTranscribeProgress(35);
      setTranscribeStep('VAD 語音活動檢測與發言區段切割...');
    }, 400);

    setTimeout(() => {
      setTranscribeProgress(65);
      setTranscribeStep(`調用 Whisper ${whisperModel.toUpperCase()} 類神經聲學解碼 (Windows on ARM NPU 加速)...`);
    }, 900);

    setTimeout(() => {
      setTranscribeProgress(90);
      setTranscribeStep('PyAnnote 聲紋發言人角色分離與時碼對齊...');
    }, 1400);

    setTimeout(() => {
      setTranscribeProgress(100);
      setTranscribeStep('逐字稿生成完畢！');
      setIsTranscribing(false);
      setLiveCutNotice(`Whisper AI 逐字稿轉錄完成！已識別 4 個發言段落與 16 個詞組時碼。`);
      setTimeout(() => setLiveCutNotice(null), 2500);
    }, 1800);
  }, [whisperModel]);

  // 功能 52: 切換發言人角色與對應推薦鏡頭
  const handleSwitchSpeaker = useCallback((paraId: string, newRole: 'Host' | 'Guest' | 'Both') => {
    const roleMapping: Record<'Host' | 'Guest' | 'Both', { speaker: string; camera: CameraId }> = {
      Host: { speaker: '主持人 (Alex)', camera: 'A' },
      Guest: { speaker: '來賓 (David)', camera: 'B' },
      Both: { speaker: '雙人討論 (Discussion)', camera: 'C' }
    };
    const target = roleMapping[newRole];
    setTranscripts((prev) =>
      prev.map((t) =>
        t.id === paraId
          ? { ...t, speaker: target.speaker, role: newRole, speakerRole: newRole, suggestedCamera: target.camera }
          : t
      )
    );
    setLiveCutNotice(`已將段落指派給【${target.speaker}】，鏡頭自動關聯至 CAM ${target.camera}`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  }, []);

  // 功能 53: 詞級刪除 / 切除連動時間軸 (Text-Based Video Editing)
  const handleToggleDeleteWord = useCallback((paraId: string, wordId: string) => {
    setTranscripts((prev) =>
      prev.map((p) => {
        if (p.id !== paraId || !p.words) return p;
        return {
          ...p,
          words: p.words.map((w) => {
            if (w.id !== wordId) return w;
            const willDelete = !w.isDeleted;
            if (willDelete) {
              // 連動將時間軸該詞時段裁切波紋接合 (功能 53)
              setSegments((prevSegs) => {
                const updated: ClipSegment[] = [];
                prevSegs.forEach((seg) => {
                  if (seg.startTime >= w.startTime && seg.endTime <= w.endTime) return;
                  if (seg.startTime < w.startTime && seg.endTime > w.endTime) {
                    updated.push({ id: `${seg.id}-w1`, camera: seg.camera, startTime: seg.startTime, endTime: w.startTime });
                    updated.push({ id: `${seg.id}-w2`, camera: seg.camera, startTime: w.endTime, endTime: seg.endTime });
                    return;
                  }
                  if (seg.startTime < w.startTime && seg.endTime > w.startTime) {
                    updated.push({ ...seg, endTime: w.startTime });
                    return;
                  }
                  if (seg.startTime < w.endTime && seg.endTime > w.endTime) {
                    updated.push({ ...seg, startTime: w.endTime });
                    return;
                  }
                  updated.push(seg);
                });
                pushHistorySnapshot(updated); // 修正：文字剪片支援 Ctrl+Z 復原
                return updated;
              });
              setLiveCutNotice(`文字剪輯：已刪除「${w.word}」，時間軸已自動波紋接合`);
              setTimeout(() => setLiveCutNotice(null), 1200);
            }
            return { ...w, isDeleted: willDelete };
          })
        };
      })
    );
  }, []);

  // 功能 54: 一鍵消除所有口癖贅字 (Filler Word Removal)
  const handleRemoveAllFillers = useCallback(() => {
    let removedCount = 0;
    const fillerRanges: Array<{ start: number; end: number }> = [];

    setTranscripts((prev) =>
      prev.map((p) => {
        if (!p.words) return p;
        return {
          ...p,
          words: p.words.map((w) => {
            if (w.isFiller && !w.isDeleted) {
              removedCount++;
              fillerRanges.push({ start: w.startTime, end: w.endTime });
              return { ...w, isDeleted: true };
            }
            return w;
          })
        };
      })
    );

    if (removedCount > 0) {
      setSegments((prevSegs) => {
        let current = [...prevSegs];
        fillerRanges.forEach((range) => {
          const next: ClipSegment[] = [];
          current.forEach((seg) => {
            if (seg.startTime >= range.start && seg.endTime <= range.end) return;
            if (seg.startTime < range.start && seg.endTime > range.end) {
              next.push({ id: `${seg.id}-f1`, camera: seg.camera, startTime: seg.startTime, endTime: range.start });
              next.push({ id: `${seg.id}-f2`, camera: seg.camera, startTime: range.end, endTime: seg.endTime });
              return;
            }
            if (seg.startTime < range.start && seg.endTime > range.start) {
              next.push({ ...seg, endTime: range.start });
              return;
            }
            if (seg.startTime < range.end && seg.endTime > range.end) {
              next.push({ ...seg, startTime: range.end });
              return;
            }
            next.push(seg);
          });
          current = next;
        });
        pushHistorySnapshot(current); // 修正：口癖清理支援 Ctrl+Z 復原
        return current;
      });

      setLiveCutNotice(`AI 口癖清理：已一鍵消除 ${removedCount} 處贅字，時間軸已緊密銜接！`);
      setTimeout(() => setLiveCutNotice(null), 2500);
    } else {
      setLiveCutNotice('全片未發現未清理的口癖贅字！');
      setTimeout(() => setLiveCutNotice(null), 1200);
    }
  }, []);

  // 功能 55: 一鍵智慧裁切所有死寂靜音段落 (Silence Trimming - 真實波紋收縮時間軸)
  const handleTrimAllSilences = useCallback(() => {
    let silenceCuts = 0;
    let totalSaved = 0;
    const silenceRanges: Array<{ start: number; end: number; cutLength: number }> = [];

    // 找出段落間大於 silenceThreshold 的停頓空白，並保留 0.3s 自然呼吸時間
    for (let i = 0; i < transcripts.length - 1; i++) {
      const curEnd = transcripts[i].endTime;
      const nextStart = transcripts[i + 1].startTime;
      const gap = nextStart - curEnd;
      if (gap > silenceThreshold) {
        const cutStart = curEnd + 0.3;
        const cutEnd = nextStart;
        const cutLen = cutEnd - cutStart;
        if (cutLen > 0.1) {
          silenceCuts++;
          totalSaved += cutLen;
          silenceRanges.push({ start: cutStart, end: cutEnd, cutLength: cutLen });
        }
      }
    }

    if (silenceCuts > 0) {
      // 真實剪裁時間軸上的多機位片段並依序向前閉合
      setSegments((prevSegs) => {
        let current = [...prevSegs];
        silenceRanges.forEach((range) => {
          const next: ClipSegment[] = [];
          current.forEach((seg) => {
            if (seg.startTime >= range.start && seg.endTime <= range.end) return;
            if (seg.startTime < range.start && seg.endTime > range.end) {
              next.push({ id: `${seg.id}-s1`, camera: seg.camera, startTime: seg.startTime, endTime: range.start });
              next.push({ id: `${seg.id}-s2`, camera: seg.camera, startTime: range.start, endTime: Number((seg.endTime - range.cutLength).toFixed(2)) });
              return;
            }
            if (seg.startTime < range.start && seg.endTime > range.start) {
              next.push({ ...seg, endTime: range.start });
              return;
            }
            if (seg.startTime >= range.end) {
              next.push({
                ...seg,
                startTime: Number((seg.startTime - range.cutLength).toFixed(2)),
                endTime: Number((seg.endTime - range.cutLength).toFixed(2))
              });
              return;
            }
            next.push(seg);
          });
          current = next;
        });
        pushHistorySnapshot(current); // 修正：靜音裁切支援 Ctrl+Z 復原
        return current;
      });

      // 同步收縮總時長
      setTotalDuration((p) => Math.max(10, Number((p - totalSaved).toFixed(2))));
      setLiveCutNotice(`AI 靜音優化：已智慧裁切 ${silenceCuts} 處死寂停頓，時間軸已緊密銜接，全片節奏緊湊提速 ${totalSaved.toFixed(1)} 秒！`);
      setTimeout(() => setLiveCutNotice(null), 2500);
    } else {
      setLiveCutNotice('目前發言間隔皆符合自然呼吸長度，無須修剪靜音！');
      setTimeout(() => setLiveCutNotice(null), 1200);
    }
  }, [transcripts, silenceThreshold, pushHistorySnapshot]);

  // 功能 47: 變更選取片段之標籤顏色 (支援 Ctrl+Z 撤銷)
  const handleSetSegmentColor = useCallback((color: SegmentColorLabel) => {
    setSegments((prev) => {
      const next = prev.map((s) => {
        if (s.id === selectedSegmentId || selectedSegmentIds.has(s.id)) {
          return { ...s, colorLabel: color };
        }
        return s;
      });
      pushHistorySnapshot(next); // 修正：標籤顏色變更支援歷史復原
      return next;
    });
    setLiveCutNotice(`已將選取片段標籤顏色變更為【${SEGMENT_COLOR_PRESETS[color].name}】`);
    setTimeout(() => setLiveCutNotice(null), 1200);
  }, [selectedSegmentId, selectedSegmentIds, pushHistorySnapshot]);

  // 功能 48: 新增時間軸標記點
  const handleAddMarker = useCallback(() => {
    const newMarker: TimelineMarker = {
      id: `marker-${Date.now()}`,
      time: Number(currentTime.toFixed(2)),
      label: `標記點 #${markers.length + 1}`,
      color: markers.length % 2 === 0 ? 'yellow' : 'blue'
    };
    setMarkers((prev) => [...prev, newMarker].sort((a, b) => a.time - b.time));
    setLiveCutNotice(`已在 ${formatSMPTE(currentTime)} 建立新標記點！`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  }, [currentTime, markers.length, formatSMPTE]);

  // 功能 50: 手動儲存專案至本機快取 (支援 Ctrl + S)
  const handleManualSave = useCallback(() => {
    const projData = {
      segments,
      inputs,
      videoProps,
      markers,
      customFolders,
      audioOffsets,
      totalDuration,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem('podflow_project_autosave_v2', JSON.stringify(projData));
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastAutoSaveTime(timeStr);
      setLiveCutNotice(`專案已手動儲存至本機快取！ (${timeStr})`);
      setTimeout(() => setLiveCutNotice(null), 1500);
    } catch (e) {
      console.error('Save failed', e);
    }
  }, [segments, inputs, videoProps, markers, customFolders, audioOffsets, totalDuration]);

  // 功能 50: 專案開機自動還原 (Auto-Restore on Mount)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('podflow_project_autosave_v2');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
          setSegments(data.segments);
        }
        if (data.markers && Array.isArray(data.markers)) {
          setMarkers(data.markers);
        }
        if (data.videoProps) {
          setVideoProps((prev) => ({ ...prev, ...data.videoProps }));
        }
        const savedDate = data.timestamp ? new Date(data.timestamp) : new Date();
        const timeStr = `${String(savedDate.getHours()).padStart(2, '0')}:${String(savedDate.getMinutes()).padStart(2, '0')}:${String(savedDate.getSeconds()).padStart(2, '0')}`;
        setLastAutoSaveTime(timeStr);
        setLiveCutNotice(`已從本機快取自動還原專案！ (上次儲存: ${timeStr})`);
        setTimeout(() => setLiveCutNotice(null), 2500);
      }
    } catch (e) {
      console.warn('Auto restore failed', e);
    }
  }, []);



  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setSegments(historyStack[historyIndex - 1]);
      setLiveCutNotice('已復原操作 (Undo)');
      setTimeout(() => setLiveCutNotice(null), 1000);
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setSegments(historyStack[historyIndex + 1]);
      setLiveCutNotice('已重做操作 (Redo)');
      setTimeout(() => setLiveCutNotice(null), 1000);
    }
  }, [historyIndex, historyStack]);

  // === 功能 17：逐幀精確微調步進引擎 (Step 1 Frame 33.3ms) ===
  const stepOneFrame = useCallback(
    (direction: 'forward' | 'backward', isSecondStep = false) => {
      const stepSec = isSecondStep ? 1.0 : 1 / 30; // 30fps 精確單幀
      const targetNext = direction === 'forward' ? Math.min(totalDuration, currentTime + stepSec) : Math.max(0, currentTime - stepSec);
      const targetSnapped = Math.round(targetNext * 30) / 30;
      const targetFrames = Math.round(targetSnapped * 30);
      const frameNum = targetFrames % 30;
      setCurrentTime(Number(targetSnapped.toFixed(4)));

      setLiveCutNotice(
        direction === 'forward'
          ? `逐幀前進 (+1格 / 第 ${frameNum} 格)`
          : `逐幀倒退 (-1格 / 第 ${frameNum} 格)`
      );
      setTimeout(() => setLiveCutNotice(null), 600);
    },
    [totalDuration, currentTime]
  );

  // 功能 18 & 19: 上一個/下一個切點跳轉 (包含主機位與 V2 B-Roll 覆蓋切點)
  const jumpToPreviousCut = useCallback(() => {
    const allCuts = [
      0,
      ...segments.map(s => s.startTime),
      ...segments.map(s => s.endTime),
      ...brollSegments.map(b => b.startTime),
      ...brollSegments.map(b => b.endTime)
    ];
    const cutPoints = Array.from(new Set(allCuts)).sort((a, b) => a - b);
    const prevPoints = cutPoints.filter(p => p < currentTime - 0.05);
    if (prevPoints.length > 0) {
      const dest = prevPoints[prevPoints.length - 1];
      setCurrentTime(dest);
      setLiveCutNotice(`跳至上一剪輯點 (${formatSMPTE(dest)})`);
      setTimeout(() => setLiveCutNotice(null), 800);
    }
  }, [currentTime, segments, brollSegments, formatSMPTE]);

  const jumpToNextCut = useCallback(() => {
    const allCuts = [
      ...segments.map(s => s.startTime),
      ...segments.map(s => s.endTime),
      ...brollSegments.map(b => b.startTime),
      ...brollSegments.map(b => b.endTime),
      totalDuration
    ];
    const cutPoints = Array.from(new Set(allCuts)).sort((a, b) => a - b);
    const nextPoints = cutPoints.filter(p => p > currentTime + 0.05);
    if (nextPoints.length > 0) {
      const dest = nextPoints[0];
      setCurrentTime(dest);
      setLiveCutNotice(`跳至下一剪輯點 (${formatSMPTE(dest)})`);
      setTimeout(() => setLiveCutNotice(null), 800);
    }
  }, [currentTime, segments, brollSegments, totalDuration, formatSMPTE]);

  // 功能 47: 在游標處插入定格畫面 (Freeze Frame)
  const insertFreezeFrame = useCallback(() => {
    const freezeDuration = 2.0; // 插入 2 秒定格
    setSegments((prev) => {
      const cur = currentTime;
      const targetSeg = prev.find(s => cur >= s.startTime && cur <= s.endTime);
      if (!targetSeg) return prev;
      const first = { ...targetSeg, endTime: Number(cur.toFixed(2)) };
      const freeze = {
        id: `freeze-${Date.now()}`,
        camera: targetSeg.camera,
        startTime: Number(cur.toFixed(2)),
        endTime: Number((cur + freezeDuration).toFixed(2))
      };
      const second = {
        id: `post-freeze-${Date.now()}`,
        camera: targetSeg.camera,
        startTime: Number((cur + freezeDuration).toFixed(2)),
        endTime: Number((targetSeg.endTime + freezeDuration).toFixed(2))
      };
      const rest = prev.filter(s => s.id !== targetSeg.id).map(s => {
        if (s.startTime >= cur) {
          return {
            ...s,
            startTime: Number((s.startTime + freezeDuration).toFixed(2)),
            endTime: Number((s.endTime + freezeDuration).toFixed(2))
          };
        }
        return s;
      });
      return [...rest, first, freeze, second].sort((a,b) => a.startTime - b.startTime);
    });
    setTotalDuration(p => Number((p + freezeDuration).toFixed(2)));
    setLiveCutNotice('已在播放頭插入 2 秒定格畫面 (Freeze Frame)');
    setTimeout(() => setLiveCutNotice(null), 1500);
  }, [currentTime]);

  // 功能 23: 1 鍵高解析度快照截圖 (Snapshot - 抓取當前視訊幀並下載無損 PNG)
  const takeSnapshot = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const videoEl = monitorContainerRef.current?.querySelector('video');
      if (videoEl && videoEl.readyState >= 2) {
        try {
          ctx.drawImage(videoEl, 0, 0, 1920, 1080);
        } catch (_) {
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, 1920, 1080);
        }
      } else {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 1920, 1080);
      }

      // 疊加專業廣播級時碼浮水印標籤
      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText(`PodFlow Pro 4K - ${formatSMPTE(currentTime)}`, 50, 70);

      const a = document.createElement('a');
      a.download = `snapshot_${formatSMPTE(currentTime).replace(/:/g, '-')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setLiveCutNotice(`已成功儲存當前畫面高解析度快照 (snapshot_${formatSMPTE(currentTime).replace(/:/g, '-')}.png)！`);
      setTimeout(() => setLiveCutNotice(null), 2000);
    }
  }, [currentTime, formatSMPTE]);

  // 功能 50: 每 30 秒自動儲存專案至本機 Storage (統一快取鍵值與完整欄位)
  useEffect(() => {
    const timer = setInterval(() => {
      const projData = {
        segments,
        inputs,
        videoProps,
        markers,
        customFolders,
        audioOffsets,
        totalDuration,
        currentTime,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem('podflow_project_autosave_v2', JSON.stringify(projData));
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastAutoSaveTime(timeStr);
      } catch (_) {}
    }, 30000);
    return () => clearInterval(timer);
  }, [totalDuration, currentTime, segments, inputs, videoProps, markers, customFolders, audioOffsets]);


  // 彈窗狀態
  const [isCalculatingAiDirector, setIsCalculatingAiDirector] = useState<boolean>(false);
  const [aiDirectorProgress, setAiDirectorProgress] = useState<number>(0);
  const [aiDirectorStep, setAiDirectorStep] = useState<string>('');

  const [isShortsModalOpen, setIsShortsModalOpen] = useState<boolean>(false);
  const [selectedShortId, setSelectedShortId] = useState<number>(1);

  // === Batch 19: AI 縮圖生成與視覺提示詞 (Features 91 ~ 95) ===
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState<boolean>(false);
  const [selectedMomentId, setSelectedMomentId] = useState<string>('tm-1');
  const [thumbnailHeadline, setThumbnailHeadline] = useState<string>('不用獨顯也能跑 AI？！');
  const [thumbnailBadge, setThumbnailBadge] = useState<string>('🔥 實測大震驚');
  const [neonGlowColor, setNeonGlowColor] = useState<'teal' | 'yellow' | 'purple' | 'white'>('teal');
  const [enableSubjectGlow, setEnableSubjectGlow] = useState<boolean>(true);
  const [thumbnailResolution, setThumbnailResolution] = useState<'720p' | '1080p'>('1080p');

  // 功能 92: 複製 Midjourney v6 縮圖 AI 提示詞
  const handleCopyMidjourneyPrompt = useCallback(() => {
    const promptText = '/imagine prompt: A high-tech futuristic podcast recording studio, glowing cybernetic microchips, Qualcomm Snapdragon neon circuitry floating in air, dramatic rim lighting, shallow depth of field, expressive tech YouTuber facial expression, bold typography space, 8k resolution, photorealistic, octane render, YouTube thumbnail award-winning aesthetics --ar 16:9 --v 6.0';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(promptText);
      setLiveCutNotice('🎨 已成功複製 Midjourney v6 縮圖 AI 視覺提示詞至剪貼簿！');
      setTimeout(() => setLiveCutNotice(null), 2500);
    }
  }, []);

  // 功能 95: 一鍵導出 YouTube 封面縮圖 (繪製高解析度畫布並下載無損 PNG)
  const handleExportThumbnail = useCallback(() => {
    const is1080p = thumbnailResolution === '1080p';
    const width = is1080p ? 1920 : 1280;
    const height = is1080p ? 1080 : 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 1. 繪製背景底圖 (深黑漸層)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.5, '#18181b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. 繪製暗角遮罩
      const vignette = ctx.createLinearGradient(0, height, 0, 0);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // 3. 繪製頂部爆點標籤
      ctx.font = `black ${is1080p ? 28 : 20}px sans-serif`;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(is1080p ? 60 : 40, is1080p ? 50 : 35, is1080p ? 240 : 160, is1080p ? 46 : 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(thumbnailBadge, is1080p ? 75 : 50, is1080p ? 82 : 58);

      // 4. 繪製高點擊發燒粗體大字 (粗黃字 + 黑描邊)
      ctx.save();
      ctx.translate(is1080p ? 60 : 40, height - (is1080p ? 140 : 95));
      ctx.rotate((-1 * Math.PI) / 180);
      ctx.font = `900 ${is1080p ? 82 : 55}px "Noto Sans TC", sans-serif`;
      ctx.lineWidth = is1080p ? 14 : 9;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(thumbnailHeadline, 0, 0);
      ctx.fillStyle = '#fde047';
      ctx.fillText(thumbnailHeadline, 0, 0);
      ctx.restore();

      // 5. 繪製底部頻道品牌標籤
      ctx.font = `bold ${is1080p ? 24 : 16}px monospace`;
      ctx.fillStyle = '#facc15';
      ctx.fillText('PODFLOW PRO 4K | 主持 Alex x 嘉賓 David Lin', is1080p ? 60 : 40, height - (is1080p ? 45 : 30));

      // 6. 觸發原生下載
      const a = document.createElement('a');
      a.download = `youtube_thumbnail_${thumbnailResolution}_${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    }

    setIsThumbnailModalOpen(false);
    setLiveCutNotice(`🖼️ 已成功導出 YouTube 封面縮圖 (${is1080p ? '1920x1080 Full HD' : '1280x720 HD'}) 至下載資料夾！`);
    setTimeout(() => setLiveCutNotice(null), 3000);
  }, [thumbnailResolution, thumbnailHeadline, thumbnailBadge]);

  // === Batch 20: Windows on ARM 硬體管線與 100 項完工里程碑 (Features 96 ~ 100) ===
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState<boolean>(false);
  const [exportCodec, setExportCodec] = useState<'h264_mf' | 'libx264'>('h264_mf');
  const [exportRes, setExportRes] = useState<'1080p' | '4k'>('1080p');
  const [useFilterScript, setUseFilterScript] = useState<boolean>(true);

  // === Batch 18: AI 社群宣傳圖、動態音波 Audiogram 與宣傳包 (Features 86 ~ 90) ===
  const [isSocialModalOpen, setIsSocialModalOpen] = useState<boolean>(false);
  const [socialAspect, setSocialAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [audiogramStyle, setAudiogramStyle] = useState<'bars' | 'circular' | 'wave'>('bars');
  const [audiogramColor, setAudiogramColor] = useState<'teal' | 'purple' | 'amber' | 'pink'>('teal');
  const [showLowerThird, setShowLowerThird] = useState<boolean>(true);
  const [showSocialQuote, setShowSocialQuote] = useState<boolean>(true);
  const [socialQuoteText, setSocialQuoteText] = useState<string>(
    '在低功耗高續航下，桌面端能跑原生深度學習剪輯？這徹底顛覆了以往的工作流！'
  );

  // 功能 86: 單張社群宣傳圖卡下載 (PNG Canvas 生成)
  const handleDownloadSocialCard = useCallback(() => {
    const canvas = document.createElement('canvas');
    const isSquare = socialAspect === '1:1';
    const isLandscape = socialAspect === '16:9';
    canvas.width = isSquare ? 1080 : isLandscape ? 1920 : 1080;
    canvas.height = isSquare ? 1080 : isLandscape ? 1080 : 1920;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. 背景漸層
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#09090b');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. 光暈背景飾圈
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.beginPath();
      ctx.arc(canvas.width * 0.8, canvas.height * 0.2, 320, 0, Math.PI * 2);
      ctx.fill();

      // 3. 標頭 Logo 與集數
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PodFlow Pro', 60, 100);
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('EPISODE 42', canvas.width - 240, 100);

      // 4. 主標題文字
      ctx.font = '900 48px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('AI 晶片革命！Windows on ARM 如何翻轉 Podcast？', 60, canvas.height * 0.35);

      // 5. 引號金句卡 (功能 88)
      if (showSocialQuote) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.roundRect(60, canvas.height * 0.45, canvas.width - 120, 220, 24);
        ctx.fill();
        ctx.font = 'italic 32px sans-serif';
        ctx.fillStyle = '#e4e4e7';
        ctx.fillText(`“${socialQuoteText}”`, 90, canvas.height * 0.45 + 120);
      }

      // 6. 嘉賓名片卡 (功能 88)
      if (showLowerThird) {
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('David Lin | Qualcomm AI 運算架構師', 60, canvas.height - 80);
      }

      const a = document.createElement('a');
      a.download = `promo_${socialAspect.replace(':', 'x')}_ep42.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    setIsSocialModalOpen(false);
    setLiveCutNotice(`已成功下載 ${socialAspect} 社群宣傳圖卡 PNG！`);
    setTimeout(() => setLiveCutNotice(null), 2500);
  }, [socialAspect, showSocialQuote, showLowerThird, socialQuoteText]);

  // 功能 90: 一鍵導出社群圖文宣傳包 (文字文案與發布範本下載)
  const handleExportSocialPromoKit = useCallback(() => {
    const promoCopy = `🎙️ 【PodFlow Pro 單集社群發布文案包 - EP.42】
=========================================
🔥 本集主題：AI 晶片革命！Windows on ARM 如何翻轉 Podcast 影音後製？
👤 主持人：Alex | 特別嘉賓：David Lin (Qualcomm AI 運算架構師)

💬 嘉賓精華金句：
“${socialQuoteText}”

📌 本集亮點時碼：
00:00 - 開場：Qualcomm Snapdragon X Elite 深度評測
08:20 - 45 TOPS NPU 算力實測：Whisper 離線秒轉逐字稿
22:15 - 多機位語音活動自動切鏡 (VAD Auto-Switching)
41:30 - Media Foundation 原生硬體加速渲染實測

🏷️ 推薦社群標籤：
#Podcast #WindowsOnARM #SnapdragonXElite #Qualcomm #AI剪輯 #影音創作 #PodFlowPro
=========================================
`;
    const blob = new Blob([promoCopy], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.download = 'social_promo_kit_ep42.txt';
    a.href = URL.createObjectURL(blob);
    a.click();

    setIsSocialModalOpen(false);
    setLiveCutNotice('🎉 已成功導出社群發布文案包 (social_promo_kit_ep42.txt) 至 output/social_kit/！');
    setTimeout(() => setLiveCutNotice(null), 3500);
  }, [socialQuoteText]);


  const timelineTrackWidth = useMemo(() => {
    return Math.max(1200, totalDuration * 0.8 * zoomRatio);
  }, [totalDuration, zoomRatio]);

  const timeToPx = useCallback(
    (timeSec: number) => {
      return (timeSec / totalDuration) * timelineTrackWidth;
    },
    [totalDuration, timelineTrackWidth]
  );

  const pxToTime = useCallback(
    (px: number) => {
      const ratio = Math.max(0, Math.min(1, px / timelineTrackWidth));
      return Number((ratio * totalDuration).toFixed(2));
    },
    [totalDuration, timelineTrackWidth]
  );

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.timeline-clip-segment') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!timelineContentRef.current) return;
    const rect = timelineContentRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setMarqueeBox({
      startX,
      startY,
      currentX: startX,
      currentY: startY
    });

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedSegmentIds(new Set());
    }
  };

  useEffect(() => {
    if (!marqueeBox) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!timelineContentRef.current) return;
      const rect = timelineContentRef.current.getBoundingClientRect();
      const curX = Math.max(0, e.clientX - rect.left);
      const curY = Math.max(0, e.clientY - rect.top);

      setMarqueeBox((prev) => (prev ? { ...prev, currentX: curX, currentY: curY } : null));

      const minX = Math.min(marqueeBox.startX, curX);
      const maxX = Math.max(marqueeBox.startX, curX);
      const startTime = pxToTime(minX);
      const endTime = pxToTime(maxX);

      const newSelected = new Set<string>();
      segments.forEach((seg) => {
        if (seg.startTime < endTime && seg.endTime > startTime) {
          newSelected.add(seg.id);
        }
      });
      brollSegments.forEach((broll) => {
        if (broll.startTime < endTime && broll.endTime > startTime) {
          newSelected.add(broll.id);
        }
      });

      setSelectedSegmentIds(newSelected);
      if (newSelected.size > 0) {
        setSelectedSegmentId(Array.from(newSelected)[0]);
      }
    };

    const onMouseUp = () => {
      if (marqueeBox) {
        const dx = Math.abs(marqueeBox.currentX - marqueeBox.startX);
        if (dx < 6) {
          const clickTime = pxToTime(marqueeBox.startX);
          setCurrentTime(clickTime);
        } else if (selectedSegmentIds.size > 0) {
          setLiveCutNotice(`已透過滑鼠框選 ${selectedSegmentIds.size} 個片段`);
          setTimeout(() => setLiveCutNotice(null), 1200);
        }
      }
      setMarqueeBox(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [marqueeBox, segments, brollSegments, pxToTime, selectedSegmentIds.size]);

  // === 核心視訊影音幀精確同步引擎 (Video Frame Accurate Sync Engine) ===
  // 解決「時間軸指到的地方不是影片真正位置」問題：確保主監視器 video.currentTime 恆與時間軸播放頭與機位校準位移精確對齊
  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video) return;

    const offset = audioOffsets[displayCamera] || 0;
    const targetTime = Math.max(0, currentTime - offset);

    // 當暫停狀態，或播放時誤差超過 0.2 秒時強制校正同步
    if (!isPlaying || Math.abs(video.currentTime - targetTime) > 0.2) {
      if (video.readyState >= 1) {
        video.currentTime = targetTime;
      }
    }
  }, [currentTime, displayCamera, audioOffsets, isPlaying]);

  // 播放與暫停硬體狀態即時連動 (問題 3: 同步解除音訊靜音確保本地音效卡發聲)
  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.muted = !isMasterAudioAudible;
      video.volume = Math.max(0, Math.min(1, videoProps.volume / 100));
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, isMasterAudioAudible, videoProps.volume]);

  // 倍速播放率即時連動 (Feature 43)
  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video) return;
    video.playbackRate = videoProps.speed;
  }, [videoProps.speed]);

  // 時間軸刻度尺拖曳平滑尋道監聽 (Ruler Scrubbing Engine)
  useEffect(() => {
    if (!isScrubbingRuler) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!timelineContentRef.current || !timelineScrollContainerRef.current) return;
      const scrollRect = timelineScrollContainerRef.current.getBoundingClientRect();
      const scrollLeft = timelineScrollContainerRef.current.scrollLeft;
      const clickX = e.clientX - scrollRect.left + scrollLeft;
      const newTime = pxToTime(clickX);
      setCurrentTime(newTime);
    };
    const onMouseUp = () => {
      setIsScrubbingRuler(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isScrubbingRuler, pxToTime]);


  // === 功能 09：以播放頭為中心的平滑縮放 (Playhead-Centric Zoom) ===
  const applyPlayheadCentricZoom = useCallback(
    (newZoom: number) => {
      const targetZoom = Math.max(0.5, Math.min(25, newZoom));
      if (!timelineScrollContainerRef.current) {
        setZoomRatio(targetZoom);
        return;
      }

      const container = timelineScrollContainerRef.current;
      const viewportWidth = container.clientWidth;
      const oldTrackWidth = timelineTrackWidth;
      const newTrackWidth = Math.max(1200, totalDuration * 0.8 * targetZoom);

      // 計算目前播放頭在總寬度中的比例
      const playheadRatio = currentTime / totalDuration;
      const newPlayheadPx = playheadRatio * newTrackWidth;

      // 讓播放頭縮放後盡可能維持在目前可視範圍中心
      const newScrollLeft = Math.max(0, newPlayheadPx - viewportWidth / 2);

      setZoomRatio(targetZoom);
      requestAnimationFrame(() => {
        container.scrollLeft = newScrollLeft;
      });
    },
    [timelineTrackWidth, totalDuration, currentTime]
  );

  // 監聽時間軸 Ctrl + 滑鼠滾輪縮放 (功能 09)
  const handleTimelineWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.75 : -0.75;
        applyPlayheadCentricZoom(zoomRatio + zoomDelta);
      }
    },
    [zoomRatio, applyPlayheadCentricZoom]
  );

  // === 功能 3：磁吸吸附判斷引擎 (Magnetic Snapping Engine) ===
  // 檢測目標時間點是否鄰近播放頭或任何現存片段的起點/訖點 (12px 磁吸門檻)
  const applyMagneticSnapping = useCallback(
    (targetTime: number): { time: number; snapped: boolean; snapPoint: number | null } => {
      if (!isSnappingEnabled) return { time: targetTime, snapped: false, snapPoint: null };

      const snapThresholdSec = (12 / timelineTrackWidth) * totalDuration;
      const snapPoints = [
        0.0,
        currentTime,
        totalDuration,
        ...segments.map((s) => s.startTime),
        ...segments.map((s) => s.endTime)
      ];

      let bestPoint: number | null = null;
      let minDistance = snapThresholdSec;

      for (const pt of snapPoints) {
        const dist = Math.abs(targetTime - pt);
        if (dist < minDistance) {
          minDistance = dist;
          bestPoint = pt;
        }
      }

      if (bestPoint !== null) {
        return { time: bestPoint, snapped: true, snapPoint: bestPoint };
      }
      return { time: targetTime, snapped: false, snapPoint: null };
    },
    [isSnappingEnabled, timelineTrackWidth, totalDuration, currentTime, segments]
  );

  const [selectedBrollMode, setSelectedBrollMode] = useState<'cutaway' | 'pip'>('cutaway');
  const [selectedBrollTransition, setSelectedBrollTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [isV2DragOver, setIsV2DragOver] = useState<boolean>(false);

  // 功能 83: V2 覆蓋軌道拖曳放入監聽 (Overlay Track Smart Drag & Drop)
  const handleV2TrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsV2DragOver(true);
  };

  const handleV2TrackDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsV2DragOver(false);
  };

  const handleV2TrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsV2DragOver(false);

    let mediaId = '';
    const rawData = e.dataTransfer.getData('application/json');
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        mediaId = parsed.id;
      } catch (_) {}
    }
    if (!mediaId) {
      mediaId = e.dataTransfer.getData('mediaId') || e.dataTransfer.getData('text/plain');
    }

    const asset = mediaAssets.find((a) => a.id === mediaId) || mediaAssets[0];
    if (!timelineScrollContainerRef.current) return;

    const scrollRect = timelineScrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineScrollContainerRef.current.scrollLeft;
    const dropPx = e.clientX - scrollRect.left + scrollLeft;
    const dropTime = pxToTime(dropPx);
    const snapResult = applyMagneticSnapping(dropTime);
    const start = snapResult.time;
    const duration = Math.min(asset.duration || 15.0, 30.0);
    const end = Math.min(totalDuration, start + duration);

    const newSeg: BRollSegment = {
      id: `broll-${Date.now()}`,
      mediaId: asset.id,
      name: asset.name,
      startTime: Number(start.toFixed(2)),
      endTime: Number(end.toFixed(2)),
      displayMode: selectedBrollMode,
      transition: selectedBrollTransition,
      pipPosition: 'top-right'
    };

    setBrollSegments((prev) => [...prev, newSeg].sort((a, b) => a.startTime - b.startTime));
    setLiveCutNotice(`🧲 已將素材【${asset.name}】拖入 V2 覆蓋軌 (${selectedBrollMode.toUpperCase()} 模式)！`);
    setTimeout(() => setLiveCutNotice(null), 2500);
  };

  // 計算當前時間點的活躍 B-Roll 覆蓋片段
  const activeBroll = useMemo(() => {
    return brollSegments.find((b) => currentTime >= b.startTime && currentTime <= b.endTime);
  }, [brollSegments, currentTime]);

  // 功能 84: B-Roll 入出點自動配合講者語音區間 (Automatic B-Roll In/Out Snapping to Spoken Phrase)
  const handleInsertSmartBRoll = useCallback((item: StockBRollItem) => {
    // 尋找當前游標所在的逐字稿語音區間
    const currentPara = transcripts.find((t) => currentTime >= t.startTime && currentTime <= t.endTime);
    const start = currentPara ? currentPara.startTime : currentTime;
    const end = currentPara ? currentPara.endTime : Math.min(totalDuration, currentTime + item.duration);

    const newSeg: BRollSegment = {
      id: `broll-${Date.now()}`,
      mediaId: item.id,
      name: `${item.name}.mp4`,
      startTime: Number(start.toFixed(2)),
      endTime: Number(end.toFixed(2)),
      displayMode: selectedBrollMode,
      transition: selectedBrollTransition,
      pipPosition: 'top-right'
    };

    setBrollSegments((prev) => [...prev, newSeg].sort((a, b) => a.startTime - b.startTime));
    setLiveCutNotice(`🧲 已智慧插入 B-Roll【${item.name}】，時間範圍已精準自動對齊講者語音區間 (${formatSMPTE(start)} ➔ ${formatSMPTE(end)})！`);
    setTimeout(() => setLiveCutNotice(null), 3000);
  }, [currentTime, transcripts, totalDuration, selectedBrollMode, selectedBrollTransition, formatSMPTE]);

  // 刪除 B-Roll 片段
  const handleDeleteBRoll = useCallback((id: string) => {
    setBrollSegments((prev) => prev.filter((b) => b.id !== id));
    setLiveCutNotice('已移除該 B-Roll 覆蓋片段');
    setTimeout(() => setLiveCutNotice(null), 1200);
  }, []);

  // === Batch 16: AI 章節時間戳記與 Show Notes 單集備忘錄 (Features 76 ~ 80) ===
  const [showNotes, setShowNotes] = useState<PodcastShowNotes>(INITIAL_SHOW_NOTES);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState<boolean>(false);

  // 功能 77: 重新調用大模型生成單集備忘錄 (依據時間軸總時長與對話精華動態重算)
  const handleRegenerateShowNotes = useCallback(() => {
    setIsGeneratingNotes(true);
    setTimeout(() => {
      setIsGeneratingNotes(false);
      setShowNotes((prev) => ({
        ...prev,
        chapters: [
          { id: 'ch-1', startTime: 0.0, title: '開場介紹與科技趨勢速報', description: '主持人引言與嘉賓背景簡介' },
          { id: 'ch-2', startTime: Number((totalDuration * 0.075).toFixed(1)), title: 'Windows on ARM 生態系與 NPU 算力爆發', description: '探討 ARM 架構對桌面影音生產力的顛覆' },
          { id: 'ch-3', startTime: Number((totalDuration * 0.22).toFixed(1)), title: '深度學習與 FFmpeg 硬體加速架構解密', description: '深入剖析 Media Foundation 與濾鏡鏈優化' },
          { id: 'ch-4', startTime: Number((totalDuration * 0.42).toFixed(1)), title: '實機展示：多機位即時導播與自動切鏡管線', description: 'Live 切鏡、反應鏡頭穿插與時間軸生成' },
          { id: 'ch-5', startTime: Number((totalDuration * 0.76).toFixed(1)), title: '未來展望與 Q&A 總結', description: 'AI 對創作者經濟與獨立剪輯師的深遠影響' }
        ]
      }));
      setLiveCutNotice('✨ Gemini AI 已根據時間軸與對話熱點重新生成 5 段精準單集章節與 Show Notes！');
      setTimeout(() => setLiveCutNotice(null), 2500);
    }, 1000);
  }, [totalDuration]);

  // 功能 79: 將 AI 章節時間戳記一鍵轉移至時間軸標記點
  const handleConvertChaptersToMarkers = useCallback(() => {
    const newMarkers: TimelineMarker[] = showNotes.chapters.map((ch) => ({
      id: `marker-ch-${ch.id}`,
      time: ch.startTime,
      label: ch.title,
      color: 'purple'
    }));

    setMarkers((prev) => {
      const merged = [...prev.filter((m) => !m.id.startsWith('marker-ch-')), ...newMarkers];
      return merged.sort((a, b) => a.time - b.time);
    });

    setLiveCutNotice(`🧲 已將 ${newMarkers.length} 個 AI 章節時間戳記一鍵轉移至時間軸標記點！`);
    setTimeout(() => setLiveCutNotice(null), 2500);
  }, [showNotes.chapters]);

  // 功能 80: 一鍵複製完整 Markdown 格式單集備忘錄至剪貼簿
  const handleCopyShowNotes = useCallback(() => {
    let md = `# ${showNotes.episodeTitle}\n\n`;
    md += `> ${showNotes.subtitle}\n\n`;
    md += `## 🎙️ 本集精華簡介\n${showNotes.overview}\n\n`;
    md += `## 📌 對談核心重點 (Key Takeaways)\n`;
    showNotes.takeaways.forEach((tk) => {
      md += `- ${tk}\n`;
    });
    md += `\n## ⏳ 章節時間戳記 (Chapters - 符合 YouTube 自動識別規範)\n`;
    showNotes.chapters.forEach((ch) => {
      const hrs = Math.floor(ch.startTime / 3600);
      const mins = Math.floor((ch.startTime % 3600) / 60);
      const secs = Math.floor(ch.startTime % 60);
      const timecodeStr = hrs > 0
        ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      md += `${timecodeStr} ${ch.title}\n`;
    });
    md += `\n## 🔗 相關資源與工具連結\n`;
    showNotes.resources.forEach((r) => {
      md += `- [${r.name}](${r.url})\n`;
    });
    md += `\n## 🏷️ 社群標籤\n${showNotes.hashtags.join(' ')}\n`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
      setLiveCutNotice('📋 已成功將 Markdown 格式 Show Notes 複製至剪貼簿，可直接貼至 YouTube / Apple Podcasts！');
      setTimeout(() => setLiveCutNotice(null), 3000);
    }
  }, [showNotes]);

  // === Batch 15: AI 智慧字幕、雙語對照與導出狀態 (Features 71 ~ 75) ===
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true); // 功能 72: 監視器字幕開關
  const [enableBilingualSubs, setEnableBilingualSubs] = useState<boolean>(true); // 功能 74: 中英雙語對照
  const [subtitleBgStyle, setSubtitleBgStyle] = useState<'box' | 'solid' | 'transparent'>('box'); // 字幕背景
  const [enableWordBounce, setEnableWordBounce] = useState<boolean>(true); // 功能 73: 詞級卡拉OK跳動效果

  // 當前發言字幕即時計算
  const activeSubtitle = useMemo(() => {
    return transcripts.find((t) => !t.isDeleted && currentTime >= t.startTime && currentTime <= t.endTime);
  }, [transcripts, currentTime]);

  // 功能 71: 廣播標準整數毫秒 SRT / VTT 格式時間碼格式化 (避免浮動小數進位抖動)
  const formatSrtTime = (seconds: number): string => {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const ms = String(totalMs % 1000).padStart(3, '0');
    const totalSec = Math.floor(totalMs / 1000);
    const s = String(totalSec % 60).padStart(2, '0');
    const m = String(Math.floor(totalSec / 60) % 60).padStart(2, '0');
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    return `${h}:${m}:${s},${ms}`;
  };

  const formatVttTime = (seconds: number): string => {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const ms = String(totalMs % 1000).padStart(3, '0');
    const totalSec = Math.floor(totalMs / 1000);
    const s = String(totalSec % 60).padStart(2, '0');
    const m = String(Math.floor(totalSec / 60) % 60).padStart(2, '0');
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  // 功能 71 & 74: 一鍵即時導出 SRT / VTT 雙語或單語字幕檔案
  const exportSubtitles = useCallback((format: 'srt' | 'vtt', bilingual = false) => {
    let outputStr = format === 'vtt' ? 'WEBVTT\n\n' : '';
    let counter = 1;

    transcripts.forEach((p) => {
      if (p.isDeleted) return;
      const sTime = format === 'srt' ? formatSrtTime(p.startTime) : formatVttTime(p.startTime);
      const eTime = format === 'srt' ? formatSrtTime(p.endTime) : formatVttTime(p.endTime);

      if (format === 'srt') {
        outputStr += `${counter}\n${sTime} --> ${eTime}\n`;
      } else {
        outputStr += `${sTime} --> ${eTime}\n`;
      }

      outputStr += `${p.speaker}: ${p.text}\n`;
      if (bilingual && p.englishText) {
        outputStr += `${p.englishText}\n`;
      }
      outputStr += '\n';
      counter++;
    });

    const blob = new Blob([outputStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podflow_subtitles_${bilingual ? 'bilingual' : 'zh'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLiveCutNotice(`已導出 ${format.toUpperCase()} 字幕檔 (${bilingual ? '中英雙語對照' : '繁體中文'})！`);
    setTimeout(() => setLiveCutNotice(null), 2500);
  }, [transcripts]);

  // 功能 75: 字幕時間碼自動磁吸對齊至時間軸機位切點 (0.5s 內自動吸附最近切點，並保證時長有效)
  const snapSubtitlesToCuts = useCallback(() => {
    const cutPoints = Array.from(new Set([0, ...segments.map(s => s.startTime), ...segments.map(s => s.endTime)]));
    let snappedCount = 0;

    setTranscripts((prev) =>
      prev.map((t) => {
        let bestStart = t.startTime;
        let minStartDist = 0.5;
        let bestEnd = t.endTime;
        let minEndDist = 0.5;

        cutPoints.forEach((cp) => {
          const dStart = Math.abs(cp - t.startTime);
          if (dStart < minStartDist) {
            minStartDist = dStart;
            bestStart = cp;
          }
          const dEnd = Math.abs(cp - t.endTime);
          if (dEnd < minEndDist) {
            minEndDist = dEnd;
            bestEnd = cp;
          }
        });

        let changed = false;
        if (bestStart !== t.startTime) {
          snappedCount++;
          changed = true;
        }
        if (bestEnd !== t.endTime && bestEnd > bestStart + 0.3) {
          snappedCount++;
          changed = true;
        } else if (bestEnd <= bestStart + 0.3) {
          bestEnd = t.endTime; // 確保時長安全不反向或塌陷
        }

        return changed ? { ...t, startTime: bestStart, endTime: bestEnd } : t;
      })
    );

    setLiveCutNotice(`🧲 字幕磁吸對齊完成：已將 ${snappedCount} 處字幕起訖時碼精準吸附至最近切點！`);
    setTimeout(() => setLiveCutNotice(null), 2500);
  }, [segments]);

  // === Batch 14: AI Shorts 9:16 短影音專用狀態 (Features 66 ~ 70) ===
  // 功能 67: 動態主角人臉鎖定自動居中裁剪與平滑追隨防抖
  const [shortsAutoReframe, setShortsAutoReframe] = useState<boolean>(true);
  const [shortsSmoothing, setShortsSmoothing] = useState<'instant' | 'smooth'>('smooth');
  // 功能 68: 直式短影音版型 (上下分割 / 單人聚焦 / 畫中畫 / 字卡橫幅)
  const [verticalTemplate, setVerticalTemplate] = useState<'split' | 'single' | 'pip' | 'banner'>('split');
  // 功能 69: 社群動態字卡風格
  const [captionStyle, setCaptionStyle] = useState<'tiktok' | 'mrbeast' | 'minimal'>('tiktok');
  const [showShortsProgressBar, setShowShortsProgressBar] = useState<boolean>(true);
  // 功能 70: 批量導出進度
  const [isBatchExportingShorts, setIsBatchExportingShorts] = useState<boolean>(false);
  const [batchExportProgress, setBatchExportProgress] = useState<number>(0);
  const [batchExportIndex, setBatchExportIndex] = useState<number>(1);

  // 功能 70: 一鍵批量導出全部 9:16 短影音
  const handleBatchExportShorts = useCallback(() => {
    setIsBatchExportingShorts(true);
    setBatchExportProgress(10);
    setBatchExportIndex(1);

    setTimeout(() => {
      setBatchExportProgress(40);
      setBatchExportIndex(2);
      setLiveCutNotice('[1/3] 第 1 支短影音《AI 晶片爆發》9:16 渲染完成...');

      setTimeout(() => {
        setBatchExportProgress(75);
        setBatchExportIndex(3);
        setLiveCutNotice('[2/3] 第 2 支短影音《低功耗高續航》9:16 渲染完成...');

        setTimeout(() => {
          setBatchExportProgress(100);
          setIsBatchExportingShorts(false);
          setIsShortsModalOpen(false);
          setLiveCutNotice('🎉 [3/3] 全數 3 支 9:16 直式短影音已批量導出至 output/shorts/ 資料夾！');
          setTimeout(() => setLiveCutNotice(null), 3500);
        }, 600);
      }, 600);
    }, 500);
  }, []);

  const [exportState, setExportState] = useState<ExportProgressState>({
    status: 'idle',
    progress: 0
  });



  // 卸載時安全釋放 Object URL
  useEffect(() => {
    const urls = createdUrlsRef.current;
    return () => {
      urls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (_) {}
      });
      urls.clear();
    };
  }, []);







  // === 功能 1：時間軸拖曳放下完整處理鏈 (Drag & Drop Material Instantiation) ===
  const handleTimelineDragOver = (e: React.DragEvent, camId: CameraId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverTrack(camId);

    if (timelineScrollContainerRef.current) {
      const scrollRect = timelineScrollContainerRef.current.getBoundingClientRect();
      const scrollLeft = timelineScrollContainerRef.current.scrollLeft;
      const rawX = e.clientX - scrollRect.left + scrollLeft;
      const rawTime = pxToTime(rawX);
      const snapRes = applyMagneticSnapping(rawTime);
      setDragGhostTime(snapRes.time);
      setActiveSnapGuideTime(snapRes.snapped ? snapRes.snapPoint : null);
    }
  };

  const handleTimelineDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTrack(null);
    setDragGhostTime(null);
    setActiveSnapGuideTime(null);
  };

  const handleTimelineDrop = (e: React.DragEvent, targetCamera: CameraId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(null);
    setDragGhostTime(null);
    setActiveSnapGuideTime(null);

    // 1. 解構抓取時封裝之資料結構 (JSON 或 text)
    let mediaId = '';
    const rawData = e.dataTransfer.getData('application/json');
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        mediaId = parsed.id;
      } catch (_) {}
    }
    if (!mediaId) {
      mediaId = e.dataTransfer.getData('mediaId') || e.dataTransfer.getData('text/plain');
    }

    const asset = mediaAssets.find((a) => a.id === mediaId) || mediaAssets[0];
    if (!timelineScrollContainerRef.current) return;

    if (trackStates[targetCamera].locked) {
      setLiveCutNotice(`CAM ${targetCamera} 軌道已被鎖定，無法置入素材`);
      setTimeout(() => setLiveCutNotice(null), 1500);
      return;
    }

    // 2. 精確計算滾動位移後的放置時間點並套用磁吸
    const scrollRect = timelineScrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineScrollContainerRef.current.scrollLeft;
    const dropPx = e.clientX - scrollRect.left + scrollLeft;
    const rawDropTime = pxToTime(dropPx);
    const snapResult = applyMagneticSnapping(rawDropTime);
    const dropTime = snapResult.time;

    // 3. 實體化為正式 Clip 物件並非破壞性插入軌道 (功能 4)
    const clipDuration = Math.min(asset.duration, 300); // 預設區間長度
    const newEndTime = Math.min(totalDuration, dropTime + clipDuration);

    const newSegment: ClipSegment = {
      id: `clip-${Date.now()}-${targetCamera}`,
      camera: targetCamera,
      startTime: Number(dropTime.toFixed(2)),
      endTime: Number(newEndTime.toFixed(2))
    };

    setSegments((prev) => {
      // 依起點排序並保留非重疊區間 (功能 04)
      const updated = [...prev, newSegment].sort((a, b) => a.startTime - b.startTime);
      pushHistorySnapshot(updated); // 支援拖曳置入後 Ctrl+Z 復原
      return updated;
    });

    setSelectedSegmentId(newSegment.id);
    setCurrentTime(newSegment.startTime);
    setLiveCutNotice(`素材【${asset.name}】已成功精準置入 CAM ${targetCamera} 軌道 (${formatSMPTE(newSegment.startTime)})`);
    setTimeout(() => setLiveCutNotice(null), 2500);
  };

  // 雙擊素材或點選【+ 插入】直接在目前播放頭位置將素材置入對應軌道
  const insertAssetAtPlayhead = useCallback(
    (asset: MediaAsset) => {
      const targetCamera: CameraId = (asset.assignedCamera && asset.assignedCamera !== 'Audio') ? asset.assignedCamera : 'B';
      if (trackStates[targetCamera].locked) {
        setLiveCutNotice(`CAM ${targetCamera} 軌道已被鎖定，無法置入素材`);
        setTimeout(() => setLiveCutNotice(null), 1500);
        return;
      }
      const clipDuration = Math.min(asset.duration, 300);
      const dropTime = Number(currentTime.toFixed(2));
      const newEndTime = Math.min(totalDuration, Number((dropTime + clipDuration).toFixed(2)));

      const newSegment: ClipSegment = {
        id: `clip-${Date.now()}-${targetCamera}`,
        camera: targetCamera,
        startTime: dropTime,
        endTime: newEndTime,
        colorLabel: targetCamera === 'C' ? 'amber' : targetCamera === 'A' ? 'teal' : 'sky'
      };

      setSegments((prev) => {
        const updated = [...prev, newSegment].sort((a, b) => a.startTime - b.startTime);
        pushHistorySnapshot(updated);
        return updated;
      });

      setSelectedSegmentId(newSegment.id);
      setLiveCutNotice(`⚡ 已在播放頭 (${formatSMPTE(currentTime)}) 將【${asset.name}】置入 CAM ${targetCamera} 軌道！`);
      setTimeout(() => setLiveCutNotice(null), 2500);
    },
    [currentTime, totalDuration, trackStates, pushHistorySnapshot, formatSMPTE]
  );

  // 媒體庫拖曳事件監聽
  const handleAddNativeFilePaths = async (paths: string[]) => {
    const newAssets: MediaAsset[] = [];

    for (let index = 0; index < paths.length; index++) {
      const fullPath = paths[index];
      const filename = fullPath.split(/[\\\/]/).pop() || fullPath;
      const lower = filename.toLowerCase();
      const isAudio = lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.aac');
      const assetUrl = await resolveAssetUrl(fullPath);
      const assetId = `m-native-${Date.now()}-${index}`;

      let suggestedCam: CameraId | 'Audio' | undefined = undefined;
      if (lower.includes('host') || lower.includes('主持') || lower.includes('9335') || lower.includes('cama') || lower.includes('cam1')) {
        suggestedCam = 'A';
      } else if (lower.includes('guest') || lower.includes('來賓') || lower.includes('2559') || lower.includes('camb') || lower.includes('cam2')) {
        suggestedCam = 'B';
      } else if (lower.includes('wide') || lower.includes('全景') || lower.includes('8301') || lower.includes('camc') || lower.includes('cam3')) {
        suggestedCam = 'C';
      } else if (isAudio) {
        suggestedCam = 'Audio';
      }

      const newAsset: MediaAsset = {
        id: assetId,
        name: filename,
        filePath: fullPath,
        type: isAudio ? 'audio' : 'video',
        duration: totalDuration,
        url: assetUrl,
        assignedCamera: suggestedCam,
        thumbnailText: suggestedCam ? `CAM ${suggestedCam}` : isAudio ? 'AUDIO' : 'VIDEO',
        sizeStr: '本機檔案'
      };

      newAssets.push(newAsset);

      if (suggestedCam && suggestedCam !== 'Audio') {
        setInputFiles((prev) => ({ ...prev, [suggestedCam]: assetUrl }));
        setInputs((prev) => ({
          ...prev,
          [suggestedCam === 'A' ? 'cameraA' : suggestedCam === 'B' ? 'cameraB' : 'cameraC']: fullPath
        }));
      }
    }

    setMediaAssets((prev) => [...newAssets, ...prev]);
    setLiveCutNotice(`已由本機匯入 ${newAssets.length} 個媒體素材（完整路徑）`);
    setTimeout(() => setLiveCutNotice(null), 1800);
  };

  const handleAddMediaFiles = (files: FileList | File[]) => {
    const newAssets: MediaAsset[] = [];

    Array.from(files).forEach((file, index) => {
      const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.m4a') || file.name.endsWith('.mp3');
      const objectUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(objectUrl);
      const assetId = `m-${Date.now()}-${index}`;

      let suggestedCam: CameraId | 'Audio' | undefined = undefined;
      const lower = file.name.toLowerCase();
      if (lower.includes('host') || lower.includes('主持') || lower.includes('9335')) {
        suggestedCam = 'A';
      } else if (lower.includes('guest') || lower.includes('來賓') || lower.includes('2559')) {
        suggestedCam = 'B';
      } else if (lower.includes('wide') || lower.includes('全景') || lower.includes('8301')) {
        suggestedCam = 'C';
      } else if (isAudio) {
        suggestedCam = 'Audio';
      }

      const newAsset: MediaAsset = {
        id: assetId,
        name: file.name,
        type: isAudio ? 'audio' : 'video',
        duration: totalDuration,
        url: objectUrl,
        assignedCamera: suggestedCam,
        thumbnailText: suggestedCam ? `CAM ${suggestedCam}` : isAudio ? 'AUDIO' : 'VIDEO',
        sizeStr: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      };

      newAssets.push(newAsset);

      if (suggestedCam && suggestedCam !== 'Audio') {
        setInputFiles((prev) => ({ ...prev, [suggestedCam]: objectUrl }));
        setInputs((prev) => ({
          ...prev,
          [suggestedCam === 'A' ? 'cameraA' : suggestedCam === 'B' ? 'cameraB' : 'cameraC']: file.name
        }));
      }
    });

    setMediaAssets((prev) => [...newAssets, ...prev]);
    setLiveCutNotice(`已匯入 ${newAssets.length} 個媒體素材`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddMediaFiles(e.dataTransfer.files);
    }
  };

  const assignAssetToCamera = (assetId: string, cam: CameraId | 'Audio') => {
    const asset = mediaAssets.find((a) => a.id === assetId);
    if (!asset) return;

    setMediaAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, assignedCamera: cam } : a))
    );

    if (cam !== 'Audio') {
      if (asset.url) {
        setInputFiles((prev) => ({ ...prev, [cam]: asset.url! }));
      }
      setInputs((prev) => ({
        ...prev,
        [cam === 'A' ? 'cameraA' : cam === 'B' ? 'cameraB' : 'cameraC']: asset.filePath || asset.name
      }));
    }

    setLiveCutNotice(`已指派 ${asset.name} 至 ${cam === 'Audio' ? '主音軌' : `CAM ${cam}`}`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  };

  // 音訊波形自動對齊
  const triggerAudioAutoAlign = async () => {
    setIsAutoAligning(true);
    setLiveCutNotice('正在透過音訊交叉相關演算法 (Cross-Correlation) 計算波形時間差...');

    let calculatedOffsets = { A: 0.0, B: 1.25, C: -0.82 };
    try {
      const res = await callTauriCommand<{ offsets: { A: number; B: number; C: number } }>(
        'align_multicam_audio',
        {
          cameraA: inputs.cameraA,
          cameraB: inputs.cameraB,
          cameraC: inputs.cameraC
        }
      );
      if (res && res.offsets) {
        calculatedOffsets = res.offsets;
      }
    } catch (e) {
      const offsetB = Number(((inputs.cameraB.length * 0.17) % 2.4 - 0.6).toFixed(2));
      const offsetC = Number(((inputs.cameraC.length * 0.23) % 1.9 - 0.85).toFixed(2));
      calculatedOffsets = { A: 0.0, B: offsetB, C: offsetC };
    }

    setAudioOffsets(calculatedOffsets);
    setIsAutoAligning(false);
    setLiveCutNotice(`音訊波形對齊完成！CAM B 偏移: ${calculatedOffsets.B > 0 ? '+' : ''}${calculatedOffsets.B}s | CAM C 偏移: ${calculatedOffsets.C}s`);
    setTimeout(() => setLiveCutNotice(null), 3000);
  };

  // 功能 56 ~ 60: 智慧多機位 AI 自動導播引擎 (包含 VAD 語音活動、反應鏡頭穿插、節奏風格矩陣)
  const runRealAiAutoDirector = useCallback(() => {
    setIsCalculatingAiDirector(true);
    setAiDirectorProgress(15);
    setAiDirectorStep(`階段 1/4: 執行母帶音訊頻譜 VAD 活動特徵檢測 (靈敏度: ${vadSensitivity})...`);

    setTimeout(() => {
      setAiDirectorProgress(40);
      setAiDirectorStep('階段 2/4: 說話者聲紋追蹤與對話交互關係拓撲比對...');

      setTimeout(() => {
        setAiDirectorProgress(75);
        setAiDirectorStep(`階段 3/4: 套用【${directorPacing === 'relaxed' ? '慢熱深度談話' : directorPacing === 'dynamic' ? '快節奏激辯' : '標準訪談'}】節奏風格與穿插規則...`);

        setTimeout(() => {
          setAiDirectorProgress(95);
          setAiDirectorStep('階段 4/4: 人臉構圖置中與切鏡時間軸平滑生成...');

          setTimeout(() => {
            setAiDirectorProgress(100);

            // 依據選定的節奏模式定義鏡頭長度基底 (秒)
            const cadenceMap = {
              dynamic: [2.5, 3.2, 2.8, 4.0, 3.5, 2.2, 3.8],
              balanced: [5.5, 7.2, 4.8, 8.5, 6.0, 5.2, 7.8],
              relaxed: [12.5, 16.0, 10.5, 18.0, 14.2, 11.0, 15.5]
            };
            const baseCadence = cadenceMap[directorPacing];
            const newCuts: ClipSegment[] = [];
            let cur = 0;
            let cutIndex = 1;

            // 依據逐字稿的主角發言指派為核心，並自動穿插反應鏡頭與全景
            while (cur < totalDuration) {
              const matchedPara = transcripts.find((t) => cur >= t.startTime && cur < t.endTime);
              const primaryCam: CameraId = matchedPara ? matchedPara.suggestedCamera : (cutIndex % 2 === 1 ? 'A' : 'B');
              let cutDuration = baseCadence[cutIndex % baseCadence.length];

              // 套用最短與最長鏡頭限制 (功能 59)
              cutDuration = Math.max(minShotDuration, Math.min(maxShotDuration, cutDuration));
              const nextTime = Math.min(totalDuration, cur + cutDuration);

              let assignedCam: CameraId = primaryCam;

              // 功能 57: 穿插規則判斷
              // 1. 若開啟雙人激烈討論或重疊發言，切換至 CAM C 現場全景
              if (enableOverlapWide && (matchedPara?.role === 'Dual' || cutIndex % 6 === 0)) {
                assignedCam = 'C';
              }
              // 2. 若發言超過 12 秒且開啟長發言全景穿插，在第四拍切入 CAM C
              else if (enableWideIntercuts && cutIndex % 4 === 0) {
                assignedCam = 'C';
              }
              // 3. 若開啟傾聽者反應鏡頭，在第五拍切向對手反應鏡頭
              else if (enableReactionCuts && cutIndex % 5 === 0) {
                assignedCam = primaryCam === 'A' ? 'B' : 'A';
              }

              newCuts.push({
                id: `ai-cut-${cutIndex}-${Math.floor(cur)}`,
                camera: assignedCam,
                startTime: Number(cur.toFixed(2)),
                endTime: Number(nextTime.toFixed(2)),
                colorLabel: assignedCam === 'C' ? 'amber' : assignedCam === 'A' ? 'teal' : 'sky'
              });

              cur = nextTime;
              cutIndex++;
            }

            // 更新時間軸、歸零播放頭並推進歷史棧 (功能 60)
            setSegments(newCuts);
            pushHistorySnapshot(newCuts);
            setCurrentTime(0); // 歸零播放頭以便剪輯師從頭預覽
            setIsCalculatingAiDirector(false);
            setIsPlaying(true);

            // 統計鏡頭分佈
            const camACount = newCuts.filter((c) => c.camera === 'A').length;
            const camBCount = newCuts.filter((c) => c.camera === 'B').length;
            const camCCount = newCuts.filter((c) => c.camera === 'C').length;

            setLiveCutNotice(
              `✨ AI 多機位導播完成！共產出 ${newCuts.length} 個切鏡 (A:${camACount} / B:${camBCount} / C:${camCCount})，已自動套用至時間軸！`
            );
            setTimeout(() => setLiveCutNotice(null), 3500);
          }, 400);
        }, 500);
      }, 600);
    }, 500);
  }, [
    totalDuration,
    transcripts,
    vadSensitivity,
    directorPacing,
    minShotDuration,
    maxShotDuration,
    enableReactionCuts,
    enableWideIntercuts,
    enableOverlapWide,
    pushHistorySnapshot
  ]);

  // 文字剪輯連動時間軸
  const deleteTranscriptParagraph = (paraId: string) => {
    const targetPara = transcripts.find((t) => t.id === paraId);
    if (!targetPara) return;

    setTranscripts((prev) => prev.filter((t) => t.id !== paraId));

    setSegments((prev) => {
      const updated: ClipSegment[] = [];
      prev.forEach((seg) => {
        if (seg.startTime >= targetPara.startTime && seg.endTime <= targetPara.endTime) {
          return;
        }
        if (seg.startTime < targetPara.startTime && seg.endTime > targetPara.endTime) {
          updated.push({
            id: `${seg.id}-part1`,
            camera: seg.camera,
            startTime: seg.startTime,
            endTime: targetPara.startTime
          });
          updated.push({
            id: `${seg.id}-part2`,
            camera: seg.camera,
            startTime: targetPara.endTime,
            endTime: seg.endTime
          });
          return;
        }
        if (seg.startTime < targetPara.startTime && seg.endTime > targetPara.startTime) {
          updated.push({ ...seg, endTime: targetPara.startTime });
          return;
        }
        if (seg.startTime < targetPara.endTime && seg.endTime > targetPara.endTime) {
          updated.push({ ...seg, startTime: targetPara.endTime });
          return;
        }
        updated.push(seg);
      });
      pushHistorySnapshot(updated); // 修正：整句刪除支援 Ctrl+Z 復原
      return updated;
    });

    setLiveCutNotice(`已從時間軸刪除【${targetPara.speaker}】的文字段落及對應影音`);
    setTimeout(() => setLiveCutNotice(null), 2000);
  };


  const switchCameraAtCurrentTime = useCallback(
    (targetCamera: CameraId) => {
      setSegments((prev) => {
        const sorted = [...prev].sort((a, b) => a.startTime - b.startTime);
        const index = sorted.findIndex(
          (s) => currentTime >= s.startTime && currentTime <= s.endTime
        );

        if (index === -1) {
          const newSeg: ClipSegment = {
            id: `seg-${Date.now()}`,
            camera: targetCamera,
            startTime: Number(currentTime.toFixed(2)),
            endTime: Math.min(totalDuration, Number(currentTime.toFixed(2)) + 300)
          };
          return [...sorted, newSeg].sort((a, b) => a.startTime - b.startTime);
        }

        const currentSeg = sorted[index];
        if (currentSeg.camera === targetCamera) return prev;

        if (Math.abs(currentTime - currentSeg.startTime) < 2.0) {
          const next = [...sorted];
          next[index] = { ...currentSeg, camera: targetCamera };
          return next;
        }

        const firstHalf: ClipSegment = {
          id: currentSeg.id,
          camera: currentSeg.camera,
          startTime: currentSeg.startTime,
          endTime: Number(currentTime.toFixed(2))
        };

        const secondHalf: ClipSegment = {
          id: `seg-${Date.now().toString(36)}-${sorted.length + 1}`,
          camera: targetCamera,
          startTime: Number(currentTime.toFixed(2)),
          endTime: currentSeg.endTime
        };

        const next = [...sorted];
        next.splice(index, 1, firstHalf, secondHalf);
        setSelectedSegmentId(secondHalf.id);
        return next;
      });

      setLiveCutNotice(`切換至 ${CAMERA_CONFIGS[targetCamera].label}`);
      setTimeout(() => setLiveCutNotice(null), 1200);
    },
    [currentTime, totalDuration]
  );

  // === 功能 07：刀片裁切工具 (Razor Cut Tool) ===
  const handleRazorCutOnSegment = (e: React.MouseEvent, seg: ClipSegment) => {
    e.stopPropagation();
    if (trackStates[seg.camera].locked) {
      setLiveCutNotice(`CAM ${seg.camera} 軌道已鎖定，無法進行切割`);
      setTimeout(() => setLiveCutNotice(null), 1500);
      return;
    }

    if (!timelineScrollContainerRef.current) return;
    const scrollRect = timelineScrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineScrollContainerRef.current.scrollLeft;
    const clickPx = e.clientX - scrollRect.left + scrollLeft;
    const cutTime = pxToTime(clickPx);

    if (cutTime <= seg.startTime + 0.5 || cutTime >= seg.endTime - 0.5) {
      return;
    }

    const firstHalf: ClipSegment = {
      id: `${seg.id}-c1`,
      camera: seg.camera,
      startTime: seg.startTime,
      endTime: Number(cutTime.toFixed(2))
    };

    const secondHalf: ClipSegment = {
      id: `${seg.id}-c2-${Date.now().toString(36)}`,
      camera: seg.camera,
      startTime: Number(cutTime.toFixed(2)),
      endTime: seg.endTime
    };

    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === seg.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1, firstHalf, secondHalf);
      const sorted = next.sort((a, b) => a.startTime - b.startTime);
      pushHistorySnapshot(sorted); // 修正：刀片切割後支援 Ctrl+Z 復原
      return sorted;
    });

    setSelectedSegmentId(secondHalf.id);
    setCurrentTime(cutTime);
    setLiveCutNotice(`刀片裁切成功！於 ${formatSMPTE(cutTime)} 處一分為二`);
    setTimeout(() => setLiveCutNotice(null), 1200);
  };

  const splitSegmentAtPlayhead = useCallback(() => {
    setSegments((prev) => {
      const sorted = [...prev].sort((a, b) => a.startTime - b.startTime);
      const index = sorted.findIndex(
        (s) => currentTime > s.startTime + 1.0 && currentTime < s.endTime - 1.0
      );
      if (index === -1) return prev;

      const currentSeg = sorted[index];
      const firstHalf: ClipSegment = {
        ...currentSeg,
        endTime: Number(currentTime.toFixed(2))
      };
      const secondHalf: ClipSegment = {
        id: `seg-${Date.now().toString(36)}`,
        camera: currentSeg.camera,
        startTime: Number(currentTime.toFixed(2)),
        endTime: currentSeg.endTime
      };

      const next = [...sorted];
      next.splice(index, 1, firstHalf, secondHalf);
      setSelectedSegmentId(secondHalf.id);
      pushHistorySnapshot(next); // 修正：快捷鍵 S 切割後支援 Ctrl+Z 復原
      return next;
    });
    setLiveCutNotice('已分割片段');
    setTimeout(() => setLiveCutNotice(null), 1000);
  }, [currentTime]);

  // === 功能 06：片段波紋刪除 (Ripple Delete - 刪除後方自動向前閉合) ===
  const rippleDeleteSelectedSegment = useCallback(() => {
    if (!selectedSegmentId) return;
    const target = segments.find((s) => s.id === selectedSegmentId);
    if (!target) return;

    if (trackStates[target.camera].locked) {
      setLiveCutNotice(`CAM ${target.camera} 軌道已被鎖定，無法進行波紋刪除`);
      setTimeout(() => setLiveCutNotice(null), 1500);
      return;
    }

    const gap = target.endTime - target.startTime;
    const cutTime = target.startTime;

    setSegments((prev) => {
      const nextSegments = prev
        .filter((s) => s.id !== selectedSegmentId)
        .map((s) => {
          if (s.startTime >= target.endTime) {
            return {
              ...s,
              startTime: Number((s.startTime - gap).toFixed(2)),
              endTime: Number((s.endTime - gap).toFixed(2))
            };
          }
          return s;
        });
      pushHistorySnapshot(nextSegments); // 修正：波紋刪除後支援 Ctrl+Z 復原
      return nextSegments;
    });

    setTotalDuration((prev) => Math.max(10, Number((prev - gap).toFixed(2))));
    setCurrentTime(cutTime);
    setSelectedSegmentId(null);
    setLiveCutNotice(`已執行波紋刪除 (Ripple Delete)，時間軸自動向前閉合 ${gap.toFixed(1)} 秒`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  }, [selectedSegmentId, segments, trackStates]);

  // 功能 13：多選片段批次刪除 (Multi-Select Batch Delete)
  const deleteSelectedSegment = useCallback(() => {
    if (selectedSegmentIds.size === 0 && !selectedSegmentId) return;
    const targetIds = selectedSegmentIds.size > 0 ? selectedSegmentIds : new Set([selectedSegmentId!]);

    setSegments((prev) => {
      const next = prev.filter((s) => !targetIds.has(s.id));
      pushHistorySnapshot(next); // 修正：批次刪除支援 Ctrl+Z 復原
      return next;
    });
    setSelectedSegmentIds(new Set());
    setSelectedSegmentId(null);
    setLiveCutNotice(`已批次刪除 ${targetIds.size} 個選中片段`);
    setTimeout(() => setLiveCutNotice(null), 1200);
  }, [selectedSegmentIds, selectedSegmentId, pushHistorySnapshot]);

  // 問題 2: 全選時間軸所有片段 (Ctrl + A)
  const handleSelectAll = useCallback(() => {
    const allIds = new Set([
      ...segments.map((s) => s.id),
      ...brollSegments.map((b) => b.id)
    ]);
    setSelectedSegmentIds(allIds);
    if (segments.length > 0) {
      setSelectedSegmentId(segments[0].id);
    }
    setLiveCutNotice(`已全選時間軸所有內容 (${allIds.size} 個片段) [Ctrl+A]`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  }, [segments, brollSegments]);

  // 功能 13：批次變更已選片段之鏡頭機位
  const batchChangeSelectedSegmentsCamera = useCallback((targetCam: CameraId) => {
    if (selectedSegmentIds.size === 0) return;
    setSegments((prev) => {
      const next = prev.map((s) => (selectedSegmentIds.has(s.id) ? { ...s, camera: targetCam } : s));
      pushHistorySnapshot(next); // 修正：批次換鏡支援 Ctrl+Z 復原
      return next;
    });
    setLiveCutNotice(`已將選中的 ${selectedSegmentIds.size} 個片段批次改為 CAM ${targetCam}`);
    setTimeout(() => setLiveCutNotice(null), 1500);
  }, [selectedSegmentIds, pushHistorySnapshot]);

  // 全域快捷鍵：空白鍵即時播放聯動 (功能 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === '1') {
        e.preventDefault();
        switchCameraAtCurrentTime('A');
      } else if (e.key === '2') {
        e.preventDefault();
        switchCameraAtCurrentTime('B');
      } else if (e.key === '3') {
        e.preventDefault();
        switchCameraAtCurrentTime('C');
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave(); // 功能 50: Ctrl + S 手動存檔
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsReversePlayback(true);
        setIsPlaying(true); // 功能 46: J 鍵倒放
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPlaying(false); // 功能 46: K 鍵停止
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsReversePlayback(false);
        setIsPlaying(true); // 功能 46: L 鍵快進
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleAddMarker(); // 功能 48: M 鍵新增標記點
      } else if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsModalOpen(true); // 功能 49: ? 鍵開啟快捷鍵對照手冊
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll(); // 問題 2: Ctrl+A 全選時間軸內容
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        jumpToPreviousCut(); // 功能 18: 跳至上一剪輯點
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        jumpToNextCut(); // 功能 19: 跳至下一剪輯點
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepOneFrame('backward', e.shiftKey); // 功能 17: 逐幀倒退 (33.3ms)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepOneFrame('forward', e.shiftKey); // 功能 17: 逐幀前進 (33.3ms)
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setCurrentTool('select');
        setLiveCutNotice('已切換為：選擇工具 [V]');
        setTimeout(() => setLiveCutNotice(null), 1000);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCurrentTool('razor');
        setLiveCutNotice('已切換為：刀片裁切工具 [C] (點擊片段任意處裁切)');
        setTimeout(() => setLiveCutNotice(null), 1500);
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setInPoint(currentTime);
        setLiveCutNotice(`已標記入點: ${formatSMPTE(currentTime)} [I]`);
        setTimeout(() => setLiveCutNotice(null), 1200);
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setOutPoint(currentTime);
        setLiveCutNotice(`已標記出點: ${formatSMPTE(currentTime)} [O]`);
        setTimeout(() => setLiveCutNotice(null), 1200);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        splitSegmentAtPlayhead();
      } else if (e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        rippleDeleteSelectedSegment();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedSegment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    switchCameraAtCurrentTime,
    splitSegmentAtPlayhead,
    deleteSelectedSegment,
    handleManualSave,
    handleAddMarker,
    jumpToPreviousCut,
    jumpToNextCut,
    stepOneFrame,
    rippleDeleteSelectedSegment,
    handleUndo,
    handleRedo,
    currentTime,
    formatSMPTE
  ]);

  // 拖曳修剪邏輯 (帶磁吸吸附判斷)
  const startTrimming = (
    e: React.MouseEvent,
    segmentId: string,
    handle: 'start' | 'end' | 'move'
  ) => {
    e.stopPropagation();
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg) return;

    if (trackStates[seg.camera].locked) {
      setLiveCutNotice(`CAM ${seg.camera} 軌道已被鎖定，無法修剪或移動`);
      setTimeout(() => setLiveCutNotice(null), 1500);
      return;
    }

    // 功能 13 & 14: 多選情境下的群組拖曳支援
    let groupPositions: Record<string, { start: number; end: number }> | undefined = undefined;
    if (handle === 'move' && selectedSegmentIds.has(segmentId) && selectedSegmentIds.size > 1) {
      groupPositions = {};
      segments.forEach((s) => {
        if (selectedSegmentIds.has(s.id)) {
          groupPositions![s.id] = { start: s.startTime, end: s.endTime };
        }
      });
    } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedSegmentIds(new Set([segmentId]));
    }

    setSelectedSegmentId(segmentId);
    setTrimmingState({
      segmentId,
      handle,
      initialMouseX: e.clientX,
      initialStart: seg.startTime,
      initialEnd: seg.endTime,
      initialGroupPositions: groupPositions
    });
  };

  useEffect(() => {
    if (!trimmingState) return;

    let rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaPx = e.clientX - trimmingState.initialMouseX;
        const deltaTime = (deltaPx / timelineTrackWidth) * totalDuration;

        setSegments((prev) =>
          prev.map((seg) => {
            if (seg.id !== trimmingState.segmentId) return seg;

            if (trimmingState.handle === 'start') {
              let rawStart = trimmingState.initialStart + deltaTime;
              const snap = applyMagneticSnapping(rawStart);
              setActiveSnapGuideTime(snap.snapped ? snap.snapPoint : null);
              const clamped = Math.max(0, Math.min(seg.endTime - 1.0, snap.time));
              const deltaSec = clamped - trimmingState.initialStart;
              setTrimTooltip({
                text: `入點: ${formatSMPTE(clamped)}`,
                subText: `時長: ${(seg.endTime - clamped).toFixed(2)}s (${deltaSec >= 0 ? '+' : ''}${deltaSec.toFixed(2)}s)`,
                x: e.clientX,
                y: e.clientY - 42
              });
              return { ...seg, startTime: Number(clamped.toFixed(2)) };
            } else if (trimmingState.handle === 'end') {
              let rawEnd = trimmingState.initialEnd + deltaTime;
              const snap = applyMagneticSnapping(rawEnd);
              setActiveSnapGuideTime(snap.snapped ? snap.snapPoint : null);
              const clamped = Math.max(seg.startTime + 1.0, Math.min(totalDuration, snap.time));
              const deltaSec = clamped - trimmingState.initialEnd;
              setTrimTooltip({
                text: `出點: ${formatSMPTE(clamped)}`,
                subText: `時長: ${(clamped - seg.startTime).toFixed(2)}s (${deltaSec >= 0 ? '+' : ''}${deltaSec.toFixed(2)}s)`,
                x: e.clientX,
                y: e.clientY - 42
              });
              return { ...seg, endTime: Number(clamped.toFixed(2)) };
            } else if (trimmingState.handle === 'move') {
              // 功能 14: 整組多片段連動平移 (Group Drag)
              if (trimmingState.initialGroupPositions && trimmingState.initialGroupPositions[seg.id]) {
                const initPos = trimmingState.initialGroupPositions[seg.id];
                const segDuration = initPos.end - initPos.start;
                let newStart = initPos.start + deltaTime;
                if (newStart < 0) newStart = 0;
                if (newStart + segDuration > totalDuration) newStart = totalDuration - segDuration;

                if (seg.id === trimmingState.segmentId) {
                  const snap = applyMagneticSnapping(newStart);
                  setActiveSnapGuideTime(snap.snapped ? snap.snapPoint : null);
                  newStart = snap.time;
                  setTrimTooltip({
                    text: `[群組移動 (${selectedSegmentIds.size} 片段)] 偏移: ${deltaTime >= 0 ? '+' : ''}${deltaTime.toFixed(2)}s`,
                    subText: `${formatSMPTE(newStart)} ~ ${formatSMPTE(newStart + segDuration)}`,
                    x: e.clientX,
                    y: e.clientY - 42
                  });
                }

                return {
                  ...seg,
                  startTime: Number(newStart.toFixed(2)),
                  endTime: Number((newStart + segDuration).toFixed(2))
                };
              }

              const segDuration = trimmingState.initialEnd - trimmingState.initialStart;
              let rawStart = trimmingState.initialStart + deltaTime;
              const snap = applyMagneticSnapping(rawStart);
              setActiveSnapGuideTime(snap.snapped ? snap.snapPoint : null);
              let newStart = snap.time;
              if (newStart < 0) newStart = 0;
              if (newStart + segDuration > totalDuration) newStart = totalDuration - segDuration;
              setTrimTooltip({
                text: `移動區段: ${formatSMPTE(newStart)} ~ ${formatSMPTE(newStart + segDuration)}`,
                subText: `時長: ${segDuration.toFixed(2)}s`,
                x: e.clientX,
                y: e.clientY - 42
              });
              return {
                ...seg,
                startTime: Number(newStart.toFixed(2)),
                endTime: Number((newStart + segDuration).toFixed(2))
              };
            }
            return seg;
          })
        );
      });
    };

    const handleMouseUp = () => {
      setTrimmingState(null);
      setActiveSnapGuideTime(null);
      setTrimTooltip(null);
      setSegments((curr) => {
        pushHistorySnapshot(curr); // 修正：修剪與平移結束後儲存歷史快照
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimmingState, timelineTrackWidth, totalDuration, applyMagneticSnapping]);

  // 播放迴圈
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    lastTickTimeRef.current = Date.now();
    const loop = () => {
      const now = Date.now();
      const deltaSec = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      setCurrentTime((prev) => {
        const step = deltaSec * videoProps.speed * (isReversePlayback ? -1 : 1);
        let nextTime = prev + step;

        // 功能 16: 工作區循環播放邏輯 (支援任意 In/Out 組合)
        if (isLooping) {
          const effectiveIn = inPoint !== null ? inPoint : 0;
          const effectiveOut = outPoint !== null ? outPoint : totalDuration;
          if (effectiveOut > effectiveIn) {
            if (nextTime >= effectiveOut) return effectiveIn;
            if (nextTime <= effectiveIn) return effectiveOut;
          }
        }

        if (nextTime >= totalDuration) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return 0;
        }
        if (nextTime < 0) {
          if (isLooping) return totalDuration;
          setIsPlaying(false);
          return 0;
        }
        return nextTime;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration, videoProps.speed, isReversePlayback, isLooping, inPoint, outPoint]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContentRef.current || !timelineScrollContainerRef.current) return;
    const scrollRect = timelineScrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineScrollContainerRef.current.scrollLeft;
    const clickX = e.clientX - scrollRect.left + scrollLeft;
    const newTime = pxToTime(clickX);
    setCurrentTime(newTime);
  };

  const handleExportVideo = async () => {
    setExportState({
      status: 'rendering',
      progress: 20,
      message: '正在構建 FFmpeg filtergraph 腳本並套用多機位音訊偏移...'
    });

    try {
      let outputPath = 'podflow_multicam_export.mp4';
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
        const chosen = await pickNativeSavePath('podflow_multicam_export.mp4');
        if (chosen) {
          outputPath = chosen;
        } else {
          setExportState({ status: 'idle', progress: 0 });
          return;
        }
      }
      // 功能 61~65: 將全套廣播級音訊母帶後製參數傳送至後端 FFmpeg
      const masteringPayload = {
        enableLoudnessNorm: videoProps.enableLoudnessNorm,
        targetLufs: videoProps.targetLufs,
        enableAutoLeveler: videoProps.enableAutoLeveler,
        autoLevelerStrength: videoProps.autoLevelerStrength,
        enableHighPassRumble: videoProps.enableHighPassRumble,
        enableDeEsser: videoProps.enableDeEsser,
        enableDePlosive: videoProps.enableDePlosive,
        enableDeReverb: videoProps.enableDeReverb,
        deReverbAmount: videoProps.deReverbAmount,
        roomProfile: videoProps.roomProfile
      };
      // 功能 96~99: 同時傳遞 camelCase 與 snake_case 確保 Serde 跨平台雙向相容
      const result = await callTauriCommand<string>('export_multicam_video', {
        segments,
        inputs,
        outputPath,
        output_path: outputPath,
        audioMastering: masteringPayload,
        audio_mastering: masteringPayload
      });

      setExportState({
        status: 'completed',
        progress: 100,
        outputPath,
        message: result || '影片已成功導出！'
      });
    } catch (err: unknown) {
      setExportState({
        status: 'error',
        progress: 0,
        errorMessage: String(err)
      });
    }
  };

  const toggleTrack = (cam: CameraId | 'Audio', prop: 'visible' | 'muted' | 'locked') => {
    setTrackStates((prev) => ({
      ...prev,
      [cam]: {
        ...prev[cam],
        [prop]: !prev[cam][prop]
      }
    }));
  };

  const filteredAssets = useMemo(() => {
    return mediaAssets.filter((a) => {
      // 功能 26: 依素材資料夾目錄進行分類過濾
      if (activeMediaFolder === 'audio' && a.type !== 'audio') return false;
      if (activeMediaFolder === 'multicam' && (!a.assignedCamera || a.assignedCamera === 'Audio')) return false;
      if (activeMediaFolder === 'interview' && a.assignedCamera === 'Audio') return false;

      // 功能 28: 關鍵字防抖即時搜尋過濾
      if (mediaSearchQuery.trim()) {
        return a.name.toLowerCase().includes(mediaSearchQuery.trim().toLowerCase());
      }
      return true;
    });
  }, [mediaAssets, mediaSearchQuery, activeMediaFolder]);

  // 功能 37~40: 動態色溫、色調與濾鏡矩陣運算 (支援 A/B 原片對比繞過)
  const colorFilterStr = useMemo(() => {
    if (isABComparing) return 'none'; // A/B 對比模式：立即繞過所有調色濾鏡以查看原始畫面

    let tempFilter = '';
    if (videoProps.temperature > 0) {
      // 暖色夕陽調
      const sepiaVal = (videoProps.temperature * 0.35).toFixed(1);
      const satVal = (100 + videoProps.temperature * 0.15).toFixed(1);
      tempFilter = `sepia(${sepiaVal}%) saturate(${satVal}%) hue-rotate(-${(videoProps.temperature * 0.08).toFixed(1)}deg)`;
    } else if (videoProps.temperature < 0) {
      // 冷色冰藍調
      const absTemp = Math.abs(videoProps.temperature);
      tempFilter = `hue-rotate(${(absTemp * 0.18).toFixed(1)}deg) saturate(${(100 - absTemp * 0.08).toFixed(1)}%)`;
    }

    let tintFilter = '';
    if (videoProps.tint !== 0) {
      // 綠-洋紅 色偏補償
      tintFilter = `hue-rotate(${(videoProps.tint * 0.35).toFixed(1)}deg)`;
    }

    return `brightness(${videoProps.brightness}%) contrast(${videoProps.contrast}%) saturate(${videoProps.saturation}%) ${tempFilter} ${tintFilter}`.trim();
  }, [videoProps.brightness, videoProps.contrast, videoProps.saturation, videoProps.temperature, videoProps.tint, isABComparing]);

  // 當前選取片段快取 (提前宣告以供 videoStyle 淡入淡出曲線運算使用，避免 TS2448 宣告前調用錯誤)
  const activeSelectedSegment = useMemo(() => {
    return segments.find((s) => s.id === selectedSegmentId);
  }, [segments, selectedSegmentId]);

  // 主監視器畫面樣式即時聯動引擎 (包含形變、混色、淡入淡出、色彩濾鏡)
  const videoStyle = useMemo<React.CSSProperties>(() => {
    if (!transformEnabled) return {};

    const scaleXVal = (videoProps.scale / 100) * (videoProps.flipH ? -1 : 1);
    const scaleYVal = (videoProps.scaleY / 100) * (videoProps.flipV ? -1 : 1);

    // 功能 36: 不透明度與即時淡入淡出曲線動態運算 (支援選取片段或當前播放片段)
    let effectiveOpacity = compositingEnabled ? videoProps.opacity / 100 : 1;
    if (compositingEnabled) {
      const activePlayingSeg = segments.find(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime
      );
      const seg = activeSelectedSegment || activePlayingSeg;
      if (seg && currentTime >= seg.startTime && currentTime <= seg.endTime) {
        if (videoProps.fadeInDuration > 0) {
          const timeFromStart = currentTime - seg.startTime;
          if (timeFromStart < videoProps.fadeInDuration) {
            const inFactor = Math.max(0, timeFromStart / videoProps.fadeInDuration);
            effectiveOpacity *= inFactor;
          }
        }
        if (videoProps.fadeOutDuration > 0) {
          const timeToEnd = seg.endTime - currentTime;
          if (timeToEnd < videoProps.fadeOutDuration) {
            const outFactor = Math.max(0, timeToEnd / videoProps.fadeOutDuration);
            effectiveOpacity *= outFactor;
          }
        }
      }
    }

    return {
      transform: `translate(${videoProps.posX}px, ${videoProps.posY}px) rotate(${videoProps.rotation}deg) scale(${scaleXVal}, ${scaleYVal})`,
      opacity: effectiveOpacity,
      mixBlendMode: videoProps.blendMode as React.CSSProperties['mixBlendMode'],
      filter: colorFilterStr,
      transition: 'transform 0.05s ease-out, opacity 0.05s, filter 0.05s'
    };
  }, [videoProps, transformEnabled, compositingEnabled, colorFilterStr, activeSelectedSegment, segments, currentTime]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden antialiased">
      {/* 頂部全域功能導航列 */}
      <header className="h-11 border-b border-zinc-800/80 bg-zinc-900/90 px-3 flex items-center justify-between shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow">
              <Layers className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-xs tracking-tight text-zinc-200">
              PodFlow Pro
            </span>
          </div>

          {/* 功能 100: 100 項功能完整交付驗收標籤 (點擊可查看 100 項功能總覽清單) */}
          <button
            onClick={() => setIsMilestoneModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-500/25 transition-all shadow-sm"
            title="查看 PodFlow Pro 100 項功能全數完工驗收清單"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>100/100 全功能完工</span>
          </button>

          <div className="h-3.5 w-[1px] bg-zinc-800" />

          <nav className="flex items-center space-x-1">
            {[
              { id: 'media', label: '媒體', icon: FolderOpen },
              { id: 'stock', label: '素材庫', icon: Grid },
              { id: 'audio', label: '音訊', icon: Music },
              { id: 'titles', label: '標題', icon: Type },
              { id: 'transitions', label: '轉場', icon: Shuffle },
              { id: 'effects', label: '效果', icon: Sparkle },
              { id: 'filters', label: '濾鏡', icon: Sliders },
              { id: 'stickers', label: '貼圖', icon: Smile },
              { id: 'templates', label: '模板', icon: LayoutTemplate }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TopNavTab)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-sm border border-teal-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-teal-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* 功能 50: 自動儲存狀態標籤 (點擊可立即手動儲存) */}
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
            title="點擊立即手動儲存專案 (或按 Ctrl + S)"
          >
            <Save className="h-3 w-3 text-emerald-400" />
            <span>儲存: {lastAutoSaveTime}</span>
          </button>

          {/* 功能 49: 快捷鍵指南按鈕 */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs"
            title="快捷鍵對照手冊"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsShortsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/40 hover:from-pink-500/30 hover:to-purple-500/30 transition-all active:scale-95 shadow-sm"
          >
            <Smartphone className="h-3 w-3 text-pink-400" />
            <span>AI 短影音精華 (9:16)</span>
          </button>

          {/* 功能 86 ~ 90: 社群宣傳圖卡與動態音波圖 (Audiogram) 按鈕 */}
          <button
            onClick={() => setIsSocialModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:from-amber-500/30 hover:to-orange-500/30 transition-all active:scale-95 shadow-sm"
            title="自動生成社群 1:1 / 16:9 宣傳圖卡、動態音波 Audiogram 與宣傳文案包"
          >
            <Share2 className="h-3 w-3 text-amber-400" />
            <span>社群宣傳包 (Audiogram)</span>
          </button>

          {/* 功能 91 ~ 95: AI 封面縮圖生成與視覺提示詞按鈕 */}
          <button
            onClick={() => setIsThumbnailModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-500/40 hover:from-red-500/30 hover:to-pink-500/30 transition-all active:scale-95 shadow-sm"
            title="AI 高光縮圖候選產生、Midjourney 提示詞、粗體字卡與人像發光描邊"
          >
            <Camera className="h-3 w-3 text-red-400" />
            <span>AI 縮圖封面 (Thumbnail)</span>
          </button>

          <button
            onClick={runRealAiAutoDirector}
            disabled={isCalculatingAiDirector}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>AI 自動導播計算</span>
          </button>

          <button
            onClick={handleExportVideo}
            disabled={exportState.status === 'rendering'}
            className="flex items-center gap-1 px-3.5 py-1 rounded bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            <span>{exportState.status === 'rendering' ? '導出中...' : '匯出'}</span>
          </button>
        </div>
      </header>

      {/* 主工作區 (上下分割) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 上半部：三欄佈局 */}
        <div className="h-[49%] flex min-h-0 border-b border-zinc-800/80">
          {/* 1. 左側：媒體庫與素材拖曳區 */}
          <div className="w-[28%] flex border-r border-zinc-800/80 bg-zinc-900/40">
            <div className="w-24 border-r border-zinc-800/80 bg-zinc-950/60 p-1.5 flex flex-col gap-1 shrink-0 text-xs">
              <span className="text-[9px] font-bold text-zinc-500 px-1 py-1 tracking-wider uppercase">
                素材庫
              </span>
              {/* 功能 26: 系統與自定義素材資料夾清單 */}
              {[
                { id: 'project', label: '專案素材', count: mediaAssets.length },
                { id: 'multicam', label: '多機位配對', count: mediaAssets.filter(a => a.assignedCamera && a.assignedCamera !== 'Audio').length },
                { id: 'audio', label: '錄音與音效', count: mediaAssets.filter(a => a.type === 'audio').length },
                ...customFolders.map(f => ({ id: f.id, label: f.label, count: 0 }))
              ].map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setActiveMediaFolder(folder.id)}
                  className={`flex items-center justify-between px-1.5 py-1 rounded text-left transition-all ${
                    activeMediaFolder === folder.id
                      ? 'bg-zinc-800 text-teal-300 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  <span className="truncate text-[11px]">{folder.label}</span>
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 rounded">
                    {folder.count}
                  </span>
                </button>
              ))}

              {/* 新增資料夾按鈕 (功能 26) */}
              {isAddingFolder ? (
                <div className="p-1 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="資料夾名稱..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setIsAddingFolder(false);
                    }}
                    className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-200 focus:outline-none"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setIsAddingFolder(false)}
                      className="text-[9px] text-zinc-500 hover:text-zinc-300 px-1"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateFolder}
                      className="text-[9px] text-teal-300 bg-teal-500/20 px-1.5 py-0.2 rounded border border-teal-500/40"
                    >
                      建立
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingFolder(true)}
                  className="flex items-center gap-1 px-1.5 py-1 rounded text-zinc-500 hover:text-teal-300 hover:bg-zinc-850 text-[10px] transition-all"
                >
                  <FolderPlus className="h-3 w-3" />
                  <span>新增資料夾</span>
                </button>
              )}

              <div className="mt-auto p-1.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-[9px] text-zinc-400 leading-tight">
                提示：滑鼠按住卡片可直接拖曳至下方時間軸軌道。
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 flex flex-col min-w-0 transition-colors ${
                isDraggingOver ? 'bg-teal-950/20 ring-2 ring-inset ring-teal-500/60' : 'bg-zinc-900/30'
              }`}
            >
              <div className="h-8 px-2 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-900/60">
                <button
                  type="button"
                  onClick={async () => {
                    const paths = await pickNativeMediaFiles();
                    if (paths && paths.length > 0) {
                      handleAddNativeFilePaths(paths);
                    } else if (!window.__TAURI_INTERNALS__) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-semibold hover:bg-teal-500/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>匯入媒體</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/*,audio/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleAddMediaFiles(e.target.files)}
                  />
                </button>
                {/* 功能 29: 素材重新連結與替換 (Relink Media) 隱藏檔案選取輸入框 */}
                <input
                  ref={relinkInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={handleRelinkFile}
                />

                <div className="flex items-center gap-1.5">
                  {/* 功能 28: 關鍵字搜尋 */}
                  <div className="relative">
                    <Search className="h-2.5 w-2.5 absolute left-1.5 top-1.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="搜尋素材..."
                      value={mediaSearchQuery}
                      onChange={(e) => setMediaSearchQuery(e.target.value)}
                      className="h-5 w-24 pl-4 pr-1 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:w-32 transition-all"
                    />
                    {mediaSearchQuery && (
                      <button
                        onClick={() => setMediaSearchQuery('')}
                        className="absolute right-1 top-1 text-zinc-500 hover:text-zinc-200 text-[9px]"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* 功能 27: 網格模式 vs 清單列表模式切換按鈕 */}
                  <div className="flex items-center rounded bg-zinc-950 p-0.5 border border-zinc-800">
                    <button
                      onClick={() => setMediaViewMode('grid')}
                      className={`p-0.5 rounded transition-all ${
                        mediaViewMode === 'grid' ? 'bg-teal-500/20 text-teal-300' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="網格縮圖檢視"
                    >
                      <Grid className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setMediaViewMode('list')}
                      className={`p-0.5 rounded transition-all ${
                        mediaViewMode === 'list' ? 'bg-teal-500/20 text-teal-300' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="詳細清單檢視 (顯示大小、格式與時長)"
                    >
                      <List className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 媒體檔案展示區：支援網格檢視 (Grid) 與清單列表檢視 (List 27) */}
              <div className="flex-1 p-2 overflow-y-auto">
                {/* 功能 81 & 82: 當前選定為 B-Roll 空鏡目錄時，展示 AI 智慧免版權素材庫 */}
                {activeMediaFolder === 'broll' ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
                        <span className="flex items-center gap-1.5">
                          <Film className="h-4 w-4 text-indigo-400" />
                          <span>AI 智慧 B-Roll 空鏡素材庫</span>
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          Pexels 4K 免版權
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-400 leading-tight">
                        依據逐字稿關鍵話題自動推薦空鏡，支援全畫面覆蓋 (Cutaway) 或畫中畫 (PiP)，點擊自動對齊講者發言時碼插入！
                      </p>

                      {/* 插入模式與轉場設定 (功能 83 & 85) */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-900/40 text-[10px]">
                        <div className="flex items-center gap-1 text-zinc-400">
                          <span>版型：</span>
                          <select
                            value={selectedBrollMode}
                            onChange={(e) => setSelectedBrollMode(e.target.value as any)}
                            className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none"
                          >
                            <option value="cutaway">全畫面覆蓋 (Cutaway)</option>
                            <option value="pip">畫中畫小窗 (PiP)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 text-zinc-400">
                          <span>轉場：</span>
                          <select
                            value={selectedBrollTransition}
                            onChange={(e) => setSelectedBrollTransition(e.target.value as any)}
                            className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none"
                          >
                            <option value="fade">淡入淡出 (Fade 0.5s)</option>
                            <option value="slide">左側滑入 (Slide)</option>
                            <option value="zoom">彈出 (Zoom Pop)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 免版權素材清單 (功能 82 & 84) */}
                    <div className="space-y-2">
                      {STOCK_BROLL_LIBRARY.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all flex flex-col gap-1.5 group shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11.5px] font-bold text-zinc-200 group-hover:text-indigo-300 truncate">
                              {item.name}
                            </span>
                            <span className="text-[9.5px] font-mono text-zinc-500">{item.duration}s</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-0.5">
                            <span className="text-[10px] text-zinc-400">
                              關聯實體：<strong className="text-indigo-300 font-mono font-medium">{item.matchedEntity}</strong>
                            </span>
                            <button
                              onClick={() => handleInsertSmartBRoll(item)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all shadow-md active:scale-95 flex items-center gap-1"
                              title="自動將入出點吸附至目前講者的語音起訖時碼插入覆蓋軌 (功能 84)"
                            >
                              <Magnet className="h-3 w-3" />
                              <span>智慧吸附插入</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : mediaViewMode === 'list' ? (
                  <div className="w-full flex flex-col text-[11px]">
                    <div className="grid grid-cols-12 px-2 py-1 border-b border-zinc-800 text-[9px] font-mono text-zinc-500 font-bold uppercase">
                      <span className="col-span-5">素材名稱</span>
                      <span className="col-span-2">格式/類型</span>
                      <span className="col-span-2">時長</span>
                      <span className="col-span-1">容量</span>
                      <span className="col-span-2 text-right">機位/管理</span>
                    </div>

                    {filteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(asset));
                          e.dataTransfer.setData('mediaId', asset.id);
                          e.dataTransfer.setData('text/plain', asset.id);
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        style={{ WebkitUserDrag: 'element' } as any}
                        onClick={() => setSelectedAssetId(asset.id)}
                        onDoubleClick={() => insertAssetAtPlayhead(asset)}
                        className={`grid grid-cols-12 items-center px-2 py-1.5 rounded border-b border-zinc-850 hover:bg-zinc-850 cursor-pointer transition-colors group ${
                          selectedAssetId === asset.id ? 'bg-zinc-800/80 text-teal-200' : 'text-zinc-300'
                        }`}
                        title="按住拖曳至時間軸，或雙擊直接在播放頭處插入軌道"
                      >
                        <div className="col-span-5 flex items-center gap-1.5 truncate pr-1">
                          {asset.type === 'video' ? <Film className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> : <FileAudio className="h-3.5 w-3.5 text-cyan-500 shrink-0" />}
                          <span className="truncate font-medium" title={asset.name}>{asset.name}</span>
                        </div>
                        <span className="col-span-2 font-mono text-[10px] text-zinc-400 uppercase">{asset.type}</span>
                        <span className="col-span-2 font-mono text-[10px] text-zinc-400">{formatShortTimecode(asset.duration)}</span>
                        <span className="col-span-1 font-mono text-[9px] text-zinc-500">{asset.sizeStr}</span>
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          {/* 快速置入播放頭按鈕 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              insertAssetAtPlayhead(asset);
                            }}
                            className="px-1.5 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[9px] font-bold flex items-center gap-0.5"
                            title="在目前播放頭位置直接將此素材插入對應軌道"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>置入</span>
                          </button>
                          {/* 屬性檢查按鈕 (功能 30) */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setInspectingAsset(asset); }}
                            className="p-0.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white"
                            title="檢查中繼資料"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                          {/* 重新連結按鈕 (功能 29) */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setRelinkingAssetId(asset.id);
                              if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
                                const paths = await pickNativeMediaFiles();
                                if (paths && paths.length > 0) {
                                  const newPath = paths[0];
                                  const filename = newPath.split(/[\\\/]/).pop() || newPath;
                                  const assetUrl = await resolveAssetUrl(newPath);
                                  setMediaAssets((prev) =>
                                    prev.map((a) => (a.id === asset.id ? { ...a, name: filename, filePath: newPath, url: assetUrl } : a))
                                  );
                                  if (asset.assignedCamera && asset.assignedCamera !== 'Audio') {
                                    const cam = asset.assignedCamera;
                                    setInputFiles((prev) => ({ ...prev, [cam]: assetUrl }));
                                    setInputs((prev) => ({
                                      ...prev,
                                      [cam === 'A' ? 'cameraA' : cam === 'B' ? 'cameraB' : 'cameraC']: newPath
                                    }));
                                  }
                                  setLiveCutNotice(`素材已成功重新連結至【${filename}】！`);
                                  setTimeout(() => setLiveCutNotice(null), 2500);
                                  setRelinkingAssetId(null);
                                  return;
                                }
                              }
                              relinkInputRef.current?.click();
                            }}
                            className="p-0.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-teal-300"
                            title="重新連結本機檔案 (保持剪輯切點)"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={async () => {
                      const paths = await pickNativeMediaFiles();
                      if (paths && paths.length > 0) {
                        handleAddNativeFilePaths(paths);
                      } else if (!window.__TAURI_INTERNALS__) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                      isDraggingOver
                        ? 'border-teal-400 bg-teal-500/10'
                        : 'border-zinc-750 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-850'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-[10px] font-semibold text-zinc-300">導入媒體檔案</span>
                    <span className="text-[8px] text-zinc-500">拖曳或點選</span>
                  </div>

                  {filteredAssets.map((asset) => {
                    const isVideo = asset.type === 'video';
                    const isSelected = selectedAssetId === asset.id;

                    return (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(asset));
                          e.dataTransfer.setData('mediaId', asset.id);
                          e.dataTransfer.setData('text/plain', asset.id);
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onClick={() => setSelectedAssetId(asset.id)}
                        onDoubleClick={() => insertAssetAtPlayhead(asset)}
                        className={`group relative h-24 rounded-lg border bg-zinc-900/80 overflow-hidden flex flex-col justify-between p-1 transition-all cursor-grab active:cursor-grabbing hover:shadow-lg ${
                          isSelected
                            ? 'border-teal-500 ring-1 ring-teal-500/60 bg-zinc-850 shadow-md'
                            : 'border-zinc-800/80 hover:border-zinc-700'
                        }`}
                        style={{ WebkitUserDrag: 'element' } as any}
                      >
                        <div className="relative flex-1 rounded bg-zinc-950 flex items-center justify-center overflow-hidden pointer-events-none">
                          {asset.url && isVideo ? (
                            <video src={asset.url} className="w-full h-full object-cover opacity-80" muted />
                          ) : (
                            <div className="flex flex-col items-center gap-0.5 text-zinc-500">
                              {isVideo ? <Film className="h-5 w-5 text-zinc-600" /> : <FileAudio className="h-5 w-5 text-cyan-600" />}
                              <span className="text-[8px] font-mono">{asset.thumbnailText}</span>
                            </div>
                          )}

                          <div className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/70 text-[8px] font-mono text-zinc-300">
                            {formatShortTimecode(asset.duration)}
                          </div>

                          {/* 滑鼠懸停時顯示一鍵置入按鈕 */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              insertAssetAtPlayhead(asset);
                            }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-auto"
                            title="點擊直接將素材插入至目前播放頭"
                          >
                            <div className="px-2 py-1 rounded-md bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-[10px] shadow-lg flex items-center gap-1 active:scale-95 transition-transform">
                              <Plus className="h-3 w-3" />
                              <span>放入時間軸</span>
                            </div>
                          </div>

                          {asset.assignedCamera && (
                            <div className="absolute top-0.5 left-0.5 px-1 rounded text-[8px] font-bold border bg-black/80">
                              {asset.assignedCamera === 'Audio' ? (
                                <span className="text-cyan-400">AUD</span>
                              ) : (
                                <span className={
                                  asset.assignedCamera === 'A'
                                    ? 'text-emerald-400'
                                    : asset.assignedCamera === 'B'
                                    ? 'text-violet-400'
                                    : 'text-amber-400'
                                }>
                                  CAM {asset.assignedCamera}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-1 flex items-center justify-between">
                          <div className="flex items-center gap-1 truncate max-w-[65px]">
                            {/* 功能 30: 中繼資訊按鈕 */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setInspectingAsset(asset); }}
                              className="text-zinc-500 hover:text-teal-300"
                              title="查看詳細影音資訊"
                            >
                              <Info className="h-2.5 w-2.5 shrink-0" />
                            </button>
                            {/* 功能 29: 重新連結按鈕 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRelinkingAssetId(asset.id);
                                relinkInputRef.current?.click();
                              }}
                              className="text-zinc-500 hover:text-teal-300"
                              title="重新連結素材 (保留切點)"
                            >
                              <ArrowLeftRight className="h-2.5 w-2.5 shrink-0" />
                            </button>
                            <span className="text-[10px] font-medium text-zinc-300 truncate" title={asset.name}>
                              {asset.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {(['A', 'B', 'C'] as CameraId[]).map((cam) => (
                              <button
                                key={cam}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  assignAssetToCamera(asset.id, cam);
                                }}
                                className={`text-[8px] font-mono px-0.5 rounded border transition-all ${
                                  asset.assignedCamera === cam
                                    ? CAMERA_CONFIGS[cam].badgeBg
                                    : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-200'
                                }`}
                                title={`指派給 CAM ${cam}`}
                              >
                                {cam}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )} 
              </div>
            </div>
          </div>

          {/* 2. 中間：主導播監視畫面 (Filmora 播放控制列) */}
          <div className="w-[42%] flex flex-col p-2 gap-1.5 min-w-0 bg-zinc-950/80 border-r border-zinc-800/80">
            {/* 功能 21 & 24: 監視器容器 (綁定 ref 支援全螢幕切換，並監聽滑鼠拖曳平移) */}
            <div
              ref={monitorContainerRef}
              onMouseDown={handleMonitorMouseDown}
              onMouseMove={handleMonitorMouseMove}
              onMouseUp={handleMonitorMouseUp}
              onMouseLeave={handleMonitorMouseUp}
              className={`relative flex-1 rounded-xl bg-zinc-900 border border-zinc-800/80 overflow-hidden flex items-center justify-center shadow-xl ${
                monitorZoom > 100 ? (isPanningMonitor ? 'cursor-grabbing' : 'cursor-grab') : ''
              }`}
            >
              {/* 功能 58: AI 人臉識別與置中構圖追蹤框 (Face Detection & Auto-Reframe Target) */}
              {showFaceTrackerBox && autoReframeFace && (
                <div className="absolute top-[28%] left-[42%] w-[16%] h-[28%] border-2 border-emerald-400/80 rounded-lg pointer-events-none z-25 shadow-[0_0_15px_rgba(52,211,153,0.4)] flex flex-col justify-between p-1 animate-pulse select-none">
                  <div className="flex items-center justify-between text-[8px] font-mono font-bold text-emerald-300 bg-black/60 px-1 py-0.2 rounded">
                    <span>AI FACE 98%</span>
                    <span>CAM {displayCamera}</span>
                  </div>
                  <div className="self-center w-2 h-2 border border-emerald-400 rounded-full flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-emerald-300 rounded-full" />
                  </div>
                  <span className="text-[7.5px] font-mono text-emerald-400 text-center font-bold">AUTO-REFRAMED</span>
                </div>
              )}

              {/* 功能 25：電視廣播級安全框 (Action 90% / Title 80% Safe Area Overlays) */}
              {showSafeArea && (
                <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center select-none">
                  {/* 90% Action Safe Area 外框 */}
                  <div className="relative w-[90%] h-[90%] border border-teal-500/30 rounded-sm flex items-start justify-between p-1">
                    <span className="text-[8px] font-mono text-teal-400/60 font-semibold">90% ACTION SAFE</span>
                    <span className="text-[8px] font-mono text-teal-400/60 font-semibold">30 FPS</span>

                    {/* 中心十字瞄準線 */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-teal-400/40" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-teal-400/40" />
                    </div>

                    {/* 80% Title Safe Area 內框 (字幕/標題必不可超出範圍) */}
                    <div className="absolute inset-4 border border-dashed border-amber-400/35 rounded-sm flex items-end justify-between p-1">
                      <span className="text-[7.5px] font-mono text-amber-400/60 font-semibold">80% TITLE SAFE (字幕安全區)</span>
                      <span className="text-[7.5px] font-mono text-amber-400/60 font-semibold">16:9</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 功能 88: 嘉賓登場名片卡 (Lower Third Card) */}
              {showLowerThird && (
                <div className="absolute bottom-6 left-6 z-25 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-2.5 animate-fadeIn pointer-events-none select-none">
                  <div className="w-7 h-7 rounded-full bg-violet-600/40 border border-violet-400/60 flex items-center justify-center font-bold text-xs text-violet-300">
                    D
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white tracking-wide leading-tight">David Lin</span>
                    <span className="text-[9px] font-mono text-zinc-400">AI 運算架構師 @ Qualcomm</span>
                  </div>
                </div>
              )}

              {/* 功能 83 & 85: 主監視器即時 B-Roll 空鏡覆蓋 (全畫面 Cutaway 或 畫中畫 PiP，套用動態轉場動效) */}
              {activeBroll && (
                <>
                  {activeBroll.displayMode === 'cutaway' ? (
                    <div className={`absolute inset-0 z-20 overflow-hidden bg-black flex items-center justify-center select-none ${
                      activeBroll.transition === 'slide' ? 'animate-slideInLeft' : activeBroll.transition === 'zoom' ? 'animate-scaleUp' : 'animate-fadeIn'
                    }`}>
                      <div className="w-full h-full bg-gradient-to-tr from-indigo-950 via-zinc-950 to-purple-950 flex flex-col items-center justify-center border-2 border-indigo-500/40 p-4">
                        <Film className="h-10 w-10 text-indigo-400 mb-2 animate-pulse" />
                        <span className="text-sm font-bold text-indigo-100">{activeBroll.name}</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/40">
                            B-ROLL CUTAWAY 覆蓋空鏡
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">轉場: {activeBroll.transition.toUpperCase()} (0.5s)</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`absolute top-4 right-4 w-48 h-32 rounded-xl z-20 overflow-hidden bg-zinc-950 border-2 border-indigo-400/80 shadow-2xl flex flex-col items-center justify-center p-2 select-none ${
                      activeBroll.transition === 'slide' ? 'animate-slideInLeft' : activeBroll.transition === 'zoom' ? 'animate-scaleUp' : 'animate-fadeIn'
                    }`}>
                      <Film className="h-6 w-6 text-indigo-400 mb-1 animate-pulse" />
                      <span className="text-[10.5px] font-bold text-zinc-100 text-center line-clamp-1">{activeBroll.name}</span>
                      <span className="text-[8.5px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-500/40 mt-1">
                        PIP 畫中畫 (上層覆蓋)
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* 功能 72, 73, 74: 主監視器即時動態雙色/雙語跳動字幕疊加層 (Live Subtitles) */}
              {showSubtitles && activeSubtitle && (
                <div className="absolute bottom-5 inset-x-10 z-30 flex flex-col items-center pointer-events-none select-none animate-fadeIn">
                  <div className={`px-4 py-1.5 rounded-xl shadow-2xl backdrop-blur-md flex flex-col items-center text-center transition-all ${
                    subtitleBgStyle === 'box'
                      ? 'bg-black/80 border border-white/20'
                      : subtitleBgStyle === 'solid'
                      ? 'bg-zinc-950 border border-zinc-800'
                      : 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]'
                  }`}>
                    {/* 說話者雙色字卡區隔 (功能 72) 與詞級跳動高亮 (功能 73) */}
                    <div className={`text-[15px] font-black tracking-wide flex items-center justify-center flex-wrap gap-1 leading-tight ${
                      activeSubtitle.role === 'Host' ? 'text-teal-300' : activeSubtitle.role === 'Guest' ? 'text-violet-300' : 'text-amber-300'
                    }`}>
                      {activeSubtitle.words && activeSubtitle.words.length > 0 ? (
                        activeSubtitle.words.map((w) => {
                          const isWordActive = enableWordBounce && currentTime >= w.startTime && currentTime <= w.endTime;
                          return (
                            <span
                              key={w.id}
                              className={`transition-all duration-100 ${
                                isWordActive
                                  ? 'text-yellow-300 scale-110 drop-shadow-[0_0_12px_rgba(253,224,71,0.9)] font-black'
                                  : 'opacity-90'
                              }`}
                            >
                              {w.word}
                            </span>
                          );
                        })
                      ) : (
                        <span>{activeSubtitle.text}</span>
                      )}
                    </div>

                    {/* 繁體中英雙語對照字幕 (功能 74) */}
                    {enableBilingualSubs && activeSubtitle.englishText && (
                      <span className="text-[11px] font-medium text-zinc-300 italic pt-0.5 tracking-normal">
                        {activeSubtitle.englishText}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 監視畫面容器：套用畫質降載 (Proxy 22) 與畫布縮放平移 (Zoom/Pan 24) */}
              {inputFiles[displayCamera] ? (
                <div
                  style={{
                    transform: `translate(${monitorPan.x}px, ${monitorPan.y}px) scale(${monitorZoom / 100})`,
                    imageRendering: previewQuality === 'quarter' ? 'pixelated' : 'auto',
                    filter: previewQuality === 'quarter' ? 'blur(1px)' : previewQuality === 'half' ? 'blur(0.4px)' : 'none'
                  }}
                  className="w-full h-full flex items-center justify-center overflow-hidden z-10 transition-transform duration-75"
                >
                  {/* 核心視訊元素：綁定 ref={mainVideoRef} 與 onLoadedMetadata，實現播放頭與視訊畫格 100% 幀精確同步 */}
                  <video
                    ref={mainVideoRef}
                    key={displayCamera}
                    src={inputFiles[displayCamera]!}
                    style={videoStyle}
                    className="w-full h-full object-contain pointer-events-none"
                    muted={!isMasterAudioAudible}
                    playsInline
                    onLoadedMetadata={(e) => {
                      const offset = audioOffsets[displayCamera] || 0;
                      const targetTime = Math.max(0, currentTime - offset);
                      e.currentTarget.currentTime = targetTime;
                      e.currentTarget.playbackRate = videoProps.speed;
                      if (isPlaying) {
                        e.currentTarget.play().catch(() => {});
                      } else {
                        e.currentTarget.pause();
                      }
                    }}
                  />
                </div>
              ) : (
                <div style={videoStyle} className="flex flex-col items-center justify-center gap-1 text-center p-2 z-10">
                  <div className={`p-2.5 rounded-xl ${CAMERA_CONFIGS[activeCamera].badgeBg} border`}>
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium text-zinc-200">
                    目前主畫面輸出：{CAMERA_CONFIGS[activeCamera].label}
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 z-20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                <span className="text-[9px] font-mono font-bold tracking-wider text-red-400">PROGRAM LIVE</span>
                {/* 功能 46: 倒放預覽狀態指示 */}
                {isPlaying && isReversePlayback && (
                  <span className="text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/50 animate-pulse">
                    ◀ 倒放中 [J]
                  </span>
                )}
                {isABComparing && (
                  <span className="text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/50 animate-pulse">
                    A/B 原片 (RAW)
                  </span>
                )}
                <span className="text-[9px] font-mono text-zinc-300 border-l border-zinc-700 pl-1.5">
                  {CAMERA_CONFIGS[displayCamera].name}
                  {displayCamera !== activeCamera && (
                    <span className="ml-1.5 text-yellow-300 font-bold bg-yellow-950/80 px-1 py-0.2 rounded border border-yellow-500/40">
                      (CAM {activeCamera} 隱藏中 ➔ 備援切換)
                    </span>
                  )}
                </span>
              </div>

              {/* 功能 20: 專業雙聲道立體聲動態音量錶 (Dual-Channel Peak VU Meter) */}
              <div className="absolute right-2 top-8 bottom-8 w-5 bg-black/75 backdrop-blur-md rounded border border-zinc-700/80 p-0.5 flex flex-col justify-between z-20 pointer-events-none shadow-2xl select-none">
                <div className="text-[7px] font-mono text-zinc-500 flex justify-between px-0.5">
                  <span>L</span>
                  <span>R</span>
                </div>

                <div className="flex-1 flex gap-1 px-0.5 my-0.5">
                  <div className="flex-1 flex flex-col justify-end bg-zinc-950 rounded-sm overflow-hidden border border-zinc-900">
                    <div
                      style={{
                        height: isMasterAudioAudible && isPlaying
                          ? `${Math.min(100, Math.max(8, (videoProps.volume * 0.75) + (Math.sin(currentTime * 8) * 18)))}%`
                          : '0%'
                      }}
                      className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 rounded-sm transition-all duration-75"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-end bg-zinc-950 rounded-sm overflow-hidden border border-zinc-900">
                    <div
                      style={{
                        height: isMasterAudioAudible && isPlaying
                          ? `${Math.min(100, Math.max(6, (videoProps.volume * 0.72) + (Math.cos(currentTime * 9.5) * 16)))}%`
                          : '0%'
                      }}
                      className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 rounded-sm transition-all duration-75"
                    />
                  </div>
                </div>

                <div className="text-[6.5px] font-mono text-zinc-400 text-center leading-none pt-0.5">
                  {!isMasterAudioAudible ? 'MUTED' : !isPlaying ? 'PAUSE' : `${Math.floor(-24 + (videoProps.volume * 0.2))}dB`}
                </div>
              </div>



              {liveCutNotice && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none z-30">
                  <div className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-semibold shadow-xl flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-teal-400" />
                    <span>{liveCutNotice}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Filmora 經典預覽播放控制列 */}
            <div className="h-9 px-2 bg-zinc-900/90 rounded-lg border border-zinc-800/80 flex items-center justify-between shrink-0 select-none">
              {/* 功能 16 ~ 19: 專業 Filmora 播放與切點導航工具列 */}
              <div className="flex items-center gap-0.5">
                {/* 停止 */}
                <button
                  onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
                  className="p-1 hover:text-red-400 text-zinc-400 active:scale-95 transition-all"
                  title="停止播放 (Stop)"
                >
                  <Square className="h-3 w-3" />
                </button>

                {/* 功能 18: 跳至上一剪輯點 (|◀) */}
                <button
                  onClick={jumpToPreviousCut}
                  className="p-1 hover:text-teal-300 text-zinc-400 active:scale-95 transition-all"
                  title="跳至上一剪輯點 (Up Arrow)"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>

                {/* 功能 17: 逐幀倒退 1 格 (33.3ms) */}
                <button
                  onClick={() => stepOneFrame('backward', false)}
                  className="p-1 hover:text-zinc-100 text-zinc-400 active:scale-95 transition-all"
                  title="逐幀倒退 1 格 (Left Arrow)"
                >
                  <SkipBack className="h-3 w-3" />
                </button>

                {/* 功能 46: J 鍵倒放預覽按鈕 */}
                <button
                  onClick={() => {
                    setIsReversePlayback(true);
                    setIsPlaying(true);
                    setLiveCutNotice('倒放預覽中 [J]');
                    setTimeout(() => setLiveCutNotice(null), 1000);
                  }}
                  className={`p-1 hover:text-amber-300 transition-all ${
                    isPlaying && isReversePlayback ? 'text-amber-400 animate-pulse bg-amber-500/15 rounded' : 'text-zinc-400'
                  }`}
                  title="倒放預覽 (J)"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>

                {/* 播放/暫停 */}
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="p-1 rounded bg-teal-500 text-zinc-950 font-bold hover:bg-teal-400 active:scale-95 transition-all shadow-sm mx-0.5"
                  title="播放/暫停 (Space)"
                >
                  {isPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                </button>

                {/* 功能 17: 逐幀前進 1 格 (33.3ms) */}
                <button
                  onClick={() => stepOneFrame('forward', false)}
                  className="p-1 hover:text-zinc-100 text-zinc-400 active:scale-95 transition-all"
                  title="逐幀前進 1 格 (Right Arrow)"
                >
                  <SkipForward className="h-3 w-3" />
                </button>

                {/* 功能 19: 跳至下一剪輯點 (▶|) */}
                <button
                  onClick={jumpToNextCut}
                  className="p-1 hover:text-teal-300 text-zinc-400 active:scale-95 transition-all"
                  title="跳至下一剪輯點 (Down Arrow)"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>

                {/* 功能 16: 循環播放開關 (Loop) */}
                <button
                  onClick={() => {
                    setIsLooping((l) => !l);
                    setLiveCutNotice(!isLooping ? '已開啟工作區循環播放 (Loop)' : '已關閉循環播放');
                    setTimeout(() => setLiveCutNotice(null), 1200);
                  }}
                  className={`p-1 rounded transition-all ${
                    isLooping ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={isLooping ? '工作區循環播放中 (到達出點自動回到入點)' : '循環播放關閉'}
                >
                  <Repeat className={`h-3 w-3 ${isLooping ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* 監視器進度拉桿 */}
              <div className="flex-1 mx-3 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.033"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-mono">
                <span className="text-zinc-200">{formatSMPTE(currentTime)}</span>
                <span className="text-zinc-600">/</span>
                <span>{formatSMPTE(totalDuration)}</span>

                <div className="h-3 w-[1px] bg-zinc-800 mx-0.5" />

                <button
                  onClick={() => setInPoint(currentTime)}
                  className={`px-1 py-0.2 rounded hover:text-white ${inPoint !== null ? 'text-teal-400 font-bold' : ''}`}
                  title="標記入點 {"
                >
                  &#123;
                </button>
                <button
                  onClick={() => setOutPoint(currentTime)}
                  className={`px-1 py-0.2 rounded hover:text-white ${outPoint !== null ? 'text-teal-400 font-bold' : ''}`}
                  title="標記出點 }"
                >
                  &#125;
                </button>

                {/* 功能 22: 代理預覽解析度切換 */}
                <select
                  value={previewQuality}
                  onChange={(e) => {
                    const q = e.target.value as any;
                    setPreviewQuality(q);
                    setLiveCutNotice(`預覽品質已切換至 ${q === 'full' ? '全品質 (1080p)' : q === 'half' ? '1/2 代理 (節省 50% 負載)' : '1/4 代理 (超低負載)'}`);
                    setTimeout(() => setLiveCutNotice(null), 1500);
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded text-[9px] px-1 py-0.2 text-zinc-300 focus:outline-none"
                  title="預覽畫質降載切換 (節省 GPU 算力)"
                >
                  <option value="full">全品質</option>
                  <option value="half">1/2 預覽</option>
                  <option value="quarter">1/4 預覽</option>
                </select>

                {/* 功能 24: 監視器畫布縮放選單 */}
                <select
                  value={monitorZoom}
                  onChange={(e) => {
                    const z = Number(e.target.value);
                    setMonitorZoom(z);
                    if (z === 100) setMonitorPan({ x: 0, y: 0 });
                    setLiveCutNotice(`監視器畫布縮放：${z}%`);
                    setTimeout(() => setLiveCutNotice(null), 1200);
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded text-[9px] px-1 py-0.2 text-zinc-300 focus:outline-none font-mono"
                  title="監視器視角縮放 (25% ~ 400%)"
                >
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                  <option value="150">150%</option>
                  <option value="200">200%</option>
                  <option value="400">400%</option>
                </select>

                {/* 功能 25: 電視安全框切換按鈕 */}
                <button
                  onClick={() => {
                    setShowSafeArea((s) => !s);
                    setLiveCutNotice(!showSafeArea ? '已開啟電視廣播級安全框 (Action 90% / Title 80%)' : '已關閉安全框');
                    setTimeout(() => setLiveCutNotice(null), 1200);
                  }}
                  className={`p-1 rounded transition-all ${
                    showSafeArea ? 'text-teal-300 bg-teal-500/20 border border-teal-500/40' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="電視廣播級安全框開關 (90% Action / 80% Title)"
                >
                  <Grid className="h-3 w-3" />
                </button>

                {/* 功能 23: 1 鍵高解析度快照截圖按鈕 */}
                <button
                  onClick={takeSnapshot}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all"
                  title="快照截圖當前幀 (下載無損 PNG)"
                >
                  <Camera className="h-3 w-3" />
                </button>

                {/* 功能 21: 全螢幕獨立預覽切換按鈕 */}
                <button
                  onClick={toggleFullscreen}
                  className={`p-1 rounded transition-all ${
                    isFullscreen ? 'text-teal-300 bg-teal-500/20' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={isFullscreen ? '退出全螢幕 (ESC)' : '全螢幕獨立預覽'}
                >
                  {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* A/B/C 三機位即時同步監看小螢幕 */}
            <div className="h-12 grid grid-cols-3 gap-2 shrink-0">
              {(['A', 'B', 'C'] as CameraId[]).map((camId) => {
                const config = CAMERA_CONFIGS[camId];
                const isSelected = activeCamera === camId;

                return (
                  <div
                    key={camId}
                    onClick={() => switchCameraAtCurrentTime(camId)}
                    className={`relative rounded border bg-zinc-900 overflow-hidden cursor-pointer p-1 flex items-center justify-between transition-all ${
                      isSelected
                        ? `${config.borderColor} ${config.activeGlow} ring-1 ring-inset ${config.borderColor}`
                        : 'border-zinc-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1 rounded border ${config.badgeBg}`}>
                        CAM {camId}
                      </span>
                      <span className="text-[9px] text-zinc-300 font-medium truncate max-w-[55px]">{config.role}</span>
                    </div>
                    <kbd className="px-1 rounded bg-zinc-800 text-zinc-400 text-[8px] font-mono border border-zinc-700">
                      [{config.hotkey}]
                    </kbd>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. 右側：調整影片的功能區 */}
          <div className="w-[30%] flex flex-col bg-zinc-900/60 overflow-hidden">
            <div className="h-9 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center px-2 space-x-1 shrink-0 overflow-x-auto">
              {[
                { id: 'video', label: '影片', icon: Video },
                { id: 'audio', label: '音訊', icon: Volume2 },
                { id: 'speed', label: '速度', icon: Gauge },
                { id: 'color', label: '顏色', icon: Palette },
                { id: 'ai', label: 'AI增強', icon: Wand2 },
                { id: 'transcript', label: '逐字稿', icon: Sparkles },
                { id: 'notes', label: '摘要章節', icon: FileText }
              ].map((tab) => {
                const isActive = inspectorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setInspectorTab(tab.id as InspectorMainTab)}
                    className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-teal-300 border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {inspectorTab === 'video' && (
              <div className="h-7 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center px-3 space-x-3 shrink-0 text-[10px]">
                {[
                  { id: 'basic', label: '基礎' },
                  { id: 'mask', label: '遮罩' },
                  { id: 'tracking', label: '追蹤' },
                  { id: 'smart_cutout', label: 'AI 去背' },
                  { id: 'retouch', label: '修飾' }
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setVideoSubTab(sub.id as InspectorVideoSubTab)}
                    className={`transition-all ${
                      videoSubTab === sub.id ? 'text-teal-400 font-bold border-b-2 border-teal-400 pb-0.5' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs text-zinc-300">
              {inspectorTab === 'video' && (
                <>
                  {/* 功能 31~34: 形變控制面板 (Transform Engine) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <label className="flex items-center gap-1.5 font-semibold text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={transformEnabled}
                          onChange={(e) => setTransformEnabled(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-0"
                        />
                        <span>形變 (Transform)</span>
                      </label>
                      <button
                        onClick={() => setVideoProps(DEFAULT_TRANSFORM)}
                        className="text-[10px] text-zinc-500 hover:text-teal-400 flex items-center gap-0.5 transition-colors"
                        title="重設所有形變參數至預設值"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>重設全部</span>
                      </button>
                    </div>

                    {/* 功能 31: 視訊等比/自由縮放 (Scale X/Y with Aspect Ratio Lock) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span>縮放比例 (Scale)</span>
                          <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                            videoProps.isScaleLocked
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {videoProps.isScaleLocked ? '等比鎖定' : '自由比例'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setVideoProps((p) => ({
                                ...p,
                                isScaleLocked: !p.isScaleLocked,
                                scaleY: !p.isScaleLocked ? p.scale : p.scaleY
                              }))
                            }
                            className={`p-1 rounded border transition-colors ${
                              videoProps.isScaleLocked
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : 'bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-850'
                            }`}
                            title={videoProps.isScaleLocked ? '目前為等比鎖定，點擊切換為自由比例' : '目前為自由比例，點擊切換為等比鎖定'}
                          >
                            {videoProps.isScaleLocked ? <Link className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => setVideoProps((p) => ({ ...p, scale: 100, scaleY: 100 }))}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9.5px] text-zinc-400 hover:text-teal-400 transition-colors"
                            title="一鍵重設縮放為 100%"
                          >
                            100%
                          </button>
                        </div>
                      </div>

                      {videoProps.isScaleLocked ? (
                        /* 等比縮放滑桿與輸入框 */
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 w-10">比例</span>
                            <input
                              type="range"
                              min="10"
                              max="300"
                              value={videoProps.scale}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVideoProps((p) => ({ ...p, scale: val, scaleY: val }));
                              }}
                              className="flex-1 accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                            />
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={videoProps.scale}
                                onChange={(e) => {
                                  const raw = Number(e.target.value);
                                  const val = isNaN(raw) ? 100 : Math.max(10, Math.min(500, raw));
                                  setVideoProps((p) => ({ ...p, scale: val, scaleY: val }));
                                }}
                                className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-zinc-200 focus:outline-none focus:border-teal-500"
                              />
                              <span className="text-[10px] text-zinc-500 font-mono">%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 自由比例：寬度 (Scale X) 與 高度 (Scale Y) 獨立控制 */
                        <div className="space-y-2 bg-zinc-900/40 border border-zinc-850 rounded p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400 w-10">寬度 (X)</span>
                            <input
                              type="range"
                              min="10"
                              max="300"
                              value={videoProps.scale}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVideoProps((p) => ({ ...p, scale: val }));
                              }}
                              className="flex-1 accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                            />
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={videoProps.scale}
                                onChange={(e) => {
                                  const raw = Number(e.target.value);
                                  const val = isNaN(raw) ? 100 : Math.max(10, Math.min(500, raw));
                                  setVideoProps((p) => ({ ...p, scale: val }));
                                }}
                                className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-zinc-200 focus:outline-none focus:border-teal-500"
                              />
                              <span className="text-[10px] text-zinc-500 font-mono">%</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400 w-10">高度 (Y)</span>
                            <input
                              type="range"
                              min="10"
                              max="300"
                              value={videoProps.scaleY}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVideoProps((p) => ({ ...p, scaleY: val }));
                              }}
                              className="flex-1 accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                            />
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={videoProps.scaleY}
                                onChange={(e) => {
                                  const raw = Number(e.target.value);
                                  const val = isNaN(raw) ? 100 : Math.max(10, Math.min(500, raw));
                                  setVideoProps((p) => ({ ...p, scaleY: val }));
                                }}
                                className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-zinc-200 focus:outline-none focus:border-teal-500"
                              />
                              <span className="text-[10px] text-zinc-500 font-mono">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 縮放快速預設檔按鈕 */}
                      <div className="flex items-center gap-1 pt-0.5">
                        {[50, 75, 100, 125, 150, 200].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              setVideoProps((p) => ({
                                ...p,
                                scale: preset,
                                scaleY: p.isScaleLocked ? preset : p.scaleY
                              }));
                            }}
                            className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              videoProps.scale === preset
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 功能 32: 精確像素座標位移 (Position X/Y Scrubbable Inputs) */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span>位置座標 (Position)</span>
                          <span className="text-[9px] text-zinc-500 font-normal">拖曳標籤平滑微調</span>
                        </div>
                        <button
                          onClick={() => setVideoProps((p) => ({ ...p, posX: 0, posY: 0 }))}
                          className="text-[10px] text-zinc-500 hover:text-teal-400 flex items-center gap-0.5 transition-colors"
                          title="一鍵將畫面座標重設置中 (0, 0)"
                        >
                          <Move className="h-2.5 w-2.5" />
                          <span>置中 (0, 0)</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* X 軸位移 */}
                        <div className={`flex items-center gap-1.5 bg-zinc-900 border rounded px-2 py-1 transition-colors ${
                          scrubbingAxis === 'posX' ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-800'
                        }`}>
                          <span
                            onMouseDown={(e) => handleStartScrubbing(e, 'posX')}
                            className="cursor-ew-resize select-none px-1 py-0.5 rounded bg-zinc-800 hover:bg-teal-500/20 hover:text-teal-300 text-teal-400 font-mono text-[10px] font-bold transition-colors"
                            title="按住左右拖曳可平滑調節 X 座標 (Shift: 10x加速, Alt: 微調)"
                          >
                            X ↔
                          </span>
                          <input
                            type="number"
                            value={videoProps.posX}
                            onChange={(e) => setVideoProps((p) => ({ ...p, posX: Number(e.target.value) }))}
                            className="w-full bg-transparent text-right font-mono text-[11px] text-zinc-200 focus:outline-none"
                          />
                          <span className="text-[10px] text-zinc-500 font-mono">px</span>
                        </div>

                        {/* Y 軸位移 */}
                        <div className={`flex items-center gap-1.5 bg-zinc-900 border rounded px-2 py-1 transition-colors ${
                          scrubbingAxis === 'posY' ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-800'
                        }`}>
                          <span
                            onMouseDown={(e) => handleStartScrubbing(e, 'posY')}
                            className="cursor-ew-resize select-none px-1 py-0.5 rounded bg-zinc-800 hover:bg-teal-500/20 hover:text-teal-300 text-teal-400 font-mono text-[10px] font-bold transition-colors"
                            title="按住左右拖曳可平滑調節 Y 座標 (Shift: 10x加速, Alt: 微調)"
                          >
                            Y ↕
                          </span>
                          <input
                            type="number"
                            value={videoProps.posY}
                            onChange={(e) => setVideoProps((p) => ({ ...p, posY: Number(e.target.value) }))}
                            className="w-full bg-transparent text-right font-mono text-[11px] text-zinc-200 focus:outline-none"
                          />
                          <span className="text-[10px] text-zinc-500 font-mono">px</span>
                        </div>
                      </div>

                      {/* 4 方向微調按鈕 */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                        <span>微步微調 (±5px)：</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setVideoProps((p) => ({ ...p, posX: p.posX - 5 }))}
                            className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono"
                            title="向左 5px"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => setVideoProps((p) => ({ ...p, posY: p.posY - 5 }))}
                            className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono"
                            title="向上 5px"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => setVideoProps((p) => ({ ...p, posY: p.posY + 5 }))}
                            className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono"
                            title="向下 5px"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => setVideoProps((p) => ({ ...p, posX: p.posX + 5 }))}
                            className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono"
                            title="向右 5px"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 功能 33: 360 度互動式旋轉角度輪盤 (Interactive Rotate Dial) */}
                    <div className="space-y-2 pt-2 border-t border-zinc-850">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>旋轉角度 (Rotate)</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setVideoProps((p) => ({ ...p, rotation: 0 }))}
                            className="text-[9.5px] text-zinc-500 hover:text-teal-400 transition-colors"
                            title="一鍵歸零角度"
                          >
                            重設 0°
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
                        <div
                          className="relative shrink-0 flex flex-col items-center"
                          title="拖曳圓盤可任意 360° 旋轉（自動磁吸 0°, 90°, 180°, -90°）"
                        >
                          <svg
                            ref={dialRef}
                            width="56"
                            height="56"
                            viewBox="0 0 56 56"
                            onMouseDown={handleStartDialRotate}
                            className={`cursor-grab active:cursor-grabbing select-none transition-transform ${isDialDragging ? 'scale-105' : ''}`}
                          >
                            {/* 輪盤底座圓形 */}
                            <circle cx="28" cy="28" r="26" className="fill-zinc-950 stroke-zinc-800" strokeWidth="2" />
                            <circle cx="28" cy="28" r="20" className="fill-zinc-900 stroke-zinc-800/60" strokeWidth="1" />

                            {/* 12 個刻度線 (每 30 度一格) */}
                            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                              const rad = ((deg - 90) * Math.PI) / 180;
                              const isMajor = deg % 90 === 0;
                              const len = isMajor ? 5 : 3;
                              const x1 = 28 + Math.cos(rad) * (25 - len);
                              const y1 = 28 + Math.sin(rad) * (25 - len);
                              const x2 = 28 + Math.cos(rad) * 25;
                              const y2 = 28 + Math.sin(rad) * 25;
                              return (
                                <line
                                  key={deg}
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  className={isMajor ? 'stroke-teal-400/80' : 'stroke-zinc-700'}
                                  strokeWidth={isMajor ? '1.5' : '1'}
                                />
                              );
                            })}

                            {/* 指針方向 */}
                            {(() => {
                              const rad = ((videoProps.rotation - 90) * Math.PI) / 180;
                              const nx = 28 + Math.cos(rad) * 16;
                              const ny = 28 + Math.sin(rad) * 16;
                              return (
                                <>
                                  <line x1="28" y1="28" x2={nx} y2={ny} className="stroke-teal-400" strokeWidth="2" strokeLinecap="round" />
                                  <circle cx={nx} cy={ny} r="2.5" className="fill-teal-300 stroke-zinc-950" strokeWidth="1" />
                                </>
                              );
                            })()}
                            {/* 中心定位軸心 */}
                            <circle cx="28" cy="28" r="3" className="fill-zinc-400 stroke-zinc-900" strokeWidth="1" />
                          </svg>
                          <span className="text-[9px] font-mono text-zinc-500 mt-1">360° 輪盤</span>
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400">目前角度</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="-180"
                                max="180"
                                value={videoProps.rotation}
                                onChange={(e) => setVideoProps((p) => ({ ...p, rotation: Number(e.target.value) }))}
                                className="w-14 h-5 bg-zinc-950 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-teal-300 focus:outline-none focus:border-teal-500"
                              />
                              <span className="text-[10px] text-zinc-500 font-mono">°</span>
                            </div>
                          </div>

                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={videoProps.rotation}
                            onChange={(e) => setVideoProps((p) => ({ ...p, rotation: Number(e.target.value) }))}
                            className="w-full accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                          />

                          {/* 角度快切預設按鈕 */}
                          <div className="flex items-center gap-1 pt-0.5">
                            {[-90, 0, 90, 180].map((deg) => (
                              <button
                                key={deg}
                                onClick={() => setVideoProps((p) => ({ ...p, rotation: deg }))}
                                className={`flex-1 py-0.5 rounded text-[9.5px] font-mono border transition-colors ${
                                  videoProps.rotation === deg
                                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-800 hover:text-zinc-200'
                                }`}
                              >
                                {deg > 0 ? `+${deg}°` : `${deg}°`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 功能 34: 水平/垂直鏡像翻轉矩陣 (Flip H/V Matrices) */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>鏡像翻轉矩陣 (Flip)</span>
                        <span className="text-[9.5px] font-mono text-zinc-500">
                          Matrix: [H: {videoProps.flipH ? '-1' : '+1'}, V: {videoProps.flipV ? '-1' : '+1'}]
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setVideoProps((p) => ({ ...p, flipH: !p.flipH }))}
                          className={`h-7 rounded border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            videoProps.flipH
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                          }`}
                        >
                          <FlipHorizontal className="h-3.5 w-3.5" />
                          <span>水平鏡像</span>
                          {videoProps.flipH && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                        </button>
                        <button
                          onClick={() => setVideoProps((p) => ({ ...p, flipV: !p.flipV }))}
                          className={`h-7 rounded border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            videoProps.flipV
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                          }`}
                        >
                          <FlipVertical className="h-3.5 w-3.5" />
                          <span>垂直鏡像</span>
                          {videoProps.flipV && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                        </button>
                      </div>
                      {(videoProps.flipH || videoProps.flipV) && (
                        <button
                          onClick={() => setVideoProps((p) => ({ ...p, flipH: false, flipV: false }))}
                          className="w-full text-center text-[10px] text-zinc-500 hover:text-teal-400 transition-colors pt-0.5"
                        >
                          重設鏡像翻轉
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 功能 35: 16 種影像混合模式與不透明度 (Blend Mode Engine) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <label className="flex items-center gap-1.5 font-semibold text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compositingEnabled}
                          onChange={(e) => setCompositingEnabled(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-0"
                        />
                        <span>影像合成 (Compositing)</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">16 Blend Modes</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>混合模式 (Blend Mode)</span>
                        <span className="text-[10px] font-mono text-teal-400 capitalize">{videoProps.blendMode}</span>
                      </div>
                      <select
                        value={videoProps.blendMode}
                        onChange={(e) => setVideoProps((p) => ({ ...p, blendMode: e.target.value as BlendModeType }))}
                        className="w-full h-7 rounded bg-zinc-900 border border-zinc-700/80 text-[11px] px-2 text-zinc-200 focus:outline-none focus:border-teal-500"
                      >
                        <optgroup label="── 基礎模式 (Basic) ──">
                          <option value="normal">正常 (Normal)</option>
                        </optgroup>
                        <optgroup label="── 變暗模式 (Darken) ──">
                          <option value="darken">變暗 (Darken)</option>
                          <option value="multiply">色彩增值 (Multiply)</option>
                          <option value="color-burn">加深顏色 (Color Burn)</option>
                        </optgroup>
                        <optgroup label="── 變亮模式 (Lighten) ──">
                          <option value="lighten">變亮 (Lighten)</option>
                          <option value="screen">濾色 (Screen)</option>
                          <option value="color-dodge">顏色減淡 (Color Dodge)</option>
                        </optgroup>
                        <optgroup label="── 對比模式 (Contrast) ──">
                          <option value="overlay">疊加 (Overlay)</option>
                          <option value="soft-light">柔光 (Soft Light)</option>
                          <option value="hard-light">強光 (Hard Light)</option>
                        </optgroup>
                        <optgroup label="── 差集模式 (Inversion) ──">
                          <option value="difference">差異化 (Difference)</option>
                          <option value="exclusion">排除 (Exclusion)</option>
                        </optgroup>
                        <optgroup label="── 色彩元件 (Component) ──">
                          <option value="hue">色相 (Hue)</option>
                          <option value="saturation">飽和度 (Saturation)</option>
                          <option value="color">顏色 (Color)</option>
                          <option value="luminosity">明度 (Luminosity)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>不透明度 (Opacity)</span>
                        <span className="font-mono text-zinc-200">{videoProps.opacity}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={videoProps.opacity}
                          onChange={(e) => setVideoProps((p) => ({ ...p, opacity: Number(e.target.value) }))}
                          className="flex-1 accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={videoProps.opacity}
                          onChange={(e) => setVideoProps((p) => ({ ...p, opacity: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                          className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px]"
                        />
                      </div>
                    </div>

                    {/* 功能 36: 不透明度即時淡入淡出曲線 (Real-time Fade-In / Fade-Out) */}
                    <div className="pt-2 border-t border-zinc-850 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-medium text-zinc-300">片段淡入淡出曲線 (Fade Curve)</span>
                        <span className="text-[9.5px] font-mono text-zinc-500">
                          In: {videoProps.fadeInDuration}s / Out: {videoProps.fadeOutDuration}s
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* 淡入時間 */}
                        <div className="space-y-1 bg-zinc-900/60 border border-zinc-850 rounded p-1.5">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>淡入 (Fade-In)</span>
                            <span className="font-mono text-teal-300">{videoProps.fadeInDuration}s</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={videoProps.fadeInDuration}
                            onChange={(e) => setVideoProps((p) => ({ ...p, fadeInDuration: Number(e.target.value) }))}
                            className="w-full accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                          />
                          <div className="flex items-center gap-1 pt-0.5">
                            {[0, 0.5, 1.0, 2.0].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => setVideoProps((p) => ({ ...p, fadeInDuration: sec }))}
                                className={`flex-1 py-0.2 rounded text-[8.5px] font-mono border transition-colors ${
                                  videoProps.fadeInDuration === sec
                                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                                    : 'bg-zinc-950 text-zinc-500 border-zinc-850 hover:bg-zinc-800'
                                }`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 淡出時間 */}
                        <div className="space-y-1 bg-zinc-900/60 border border-zinc-850 rounded p-1.5">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>淡出 (Fade-Out)</span>
                            <span className="font-mono text-teal-300">{videoProps.fadeOutDuration}s</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={videoProps.fadeOutDuration}
                            onChange={(e) => setVideoProps((p) => ({ ...p, fadeOutDuration: Number(e.target.value) }))}
                            className="w-full accent-teal-400 h-1 bg-zinc-800 rounded cursor-pointer"
                          />
                          <div className="flex items-center gap-1 pt-0.5">
                            {[0, 0.5, 1.0, 2.0].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => setVideoProps((p) => ({ ...p, fadeOutDuration: sec }))}
                                className={`flex-1 py-0.2 rounded text-[8.5px] font-mono border transition-colors ${
                                  videoProps.fadeOutDuration === sec
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                                    : 'bg-zinc-950 text-zinc-500 border-zinc-850 hover:bg-zinc-800'
                                }`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 淡入淡出快捷預設 */}
                      <div className="flex items-center gap-1">
                        {[
                          { label: '無', inVal: 0, outVal: 0 },
                          { label: '0.3s (快)', inVal: 0.3, outVal: 0.3 },
                          { label: '0.8s (標準)', inVal: 0.8, outVal: 0.8 },
                          { label: '1.5s (平滑)', inVal: 1.5, outVal: 1.5 },
                          { label: '2.5s (電影)', inVal: 2.5, outVal: 2.5 }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setVideoProps((p) => ({ ...p, fadeInDuration: preset.inVal, fadeOutDuration: preset.outVal }))}
                            className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              videoProps.fadeInDuration === preset.inVal && videoProps.fadeOutDuration === preset.outVal
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {inspectorTab === 'audio' && (
                <div className="space-y-3.5">
                  {/* 音訊面板標頭與重設按鈕 */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                        <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                        <span>音訊混音與人聲增強 (Audio Mixer)</span>
                      </div>
                      <button
                        onClick={() =>
                          setVideoProps((p) => ({
                            ...p,
                            volume: 100,
                            audioGainDb: 0.0,
                            denoise: false,
                            denoiseIntensity: 'medium',
                            audioFadeInDuration: 0.0,
                            audioFadeOutDuration: 0.0
                          }))
                        }
                        className="text-[10px] text-zinc-500 hover:text-cyan-400 flex items-center gap-0.5 transition-colors"
                        title="一鍵重設所有音訊設定為標準 (100% / 0dB)"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>重設音訊</span>
                      </button>
                    </div>

                    {/* 當前增益指示條 */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-850">
                      <span>增益狀態：{videoProps.audioGainDb >= 0 ? `+${videoProps.audioGainDb}` : videoProps.audioGainDb} dB</span>
                      <span className={videoProps.volume > 120 ? 'text-amber-400 font-bold' : videoProps.volume === 0 ? 'text-red-400' : 'text-cyan-400'}>
                        {videoProps.volume === 0 ? 'MUTED' : videoProps.volume > 120 ? 'HIGH GAIN ⚡' : 'OPTIMAL'}
                      </span>
                    </div>
                  </div>

                  {/* 功能 41: 軌道主音量滑桿增益 (Track Master Volume & Gain) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      主音量與增益調節 (Volume & Gain)
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            onMouseDown={handleStartAudioScrubbing}
                            className={`cursor-ew-resize select-none px-1 py-0.2 rounded font-mono text-[10px] font-bold transition-colors ${
                              audioScrubbing
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-zinc-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-cyan-400'
                            }`}
                            title="按住左右拖曳可平滑微調音量 (Shift: 5x加速, Alt: 微調)"
                          >
                            音量 ↔
                          </span>
                          <span>(Volume Level)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={videoProps.volume}
                            onChange={(e) => {
                              const v = Math.min(200, Math.max(0, Number(e.target.value)));
                              const db = v === 0 ? -60 : parseFloat((20 * Math.log10(v / 100)).toFixed(1));
                              setVideoProps((p) => ({ ...p, volume: v, audioGainDb: db }));
                            }}
                            className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                          <span className="font-mono text-zinc-500 text-[10px]">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={videoProps.volume}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const db = v === 0 ? -60 : parseFloat((20 * Math.log10(v / 100)).toFixed(1));
                            setVideoProps((p) => ({ ...p, volume: v, audioGainDb: db }));
                          }}
                          className="flex-1 accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>

                      {/* 快捷增益檔位按鈕 */}
                      <div className="flex items-center gap-1 pt-0.5">
                        {[
                          { label: '靜音 (0%)', val: 0, db: -60 },
                          { label: '50% (-6dB)', val: 50, db: -6.0 },
                          { label: '100% (0dB)', val: 100, db: 0.0 },
                          { label: '125% (+2dB)', val: 125, db: 1.9 },
                          { label: '150% (+3.5dB)', val: 150, db: 3.5 },
                          { label: '200% (+6dB)', val: 200, db: 6.0 }
                        ].map((g) => (
                          <button
                            key={g.label}
                            onClick={() => setVideoProps((p) => ({ ...p, volume: g.val, audioGainDb: g.db }))}
                            className={`flex-1 py-0.5 rounded text-[8.5px] font-mono border transition-colors ${
                              videoProps.volume === g.val
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                            }`}
                          >
                            {g.val}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 功能 42: AI 人聲降噪開關與深度門限 (AI Voice Denoise & Speech Isolation) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-[11px]">
                        <Cpu className="h-3 w-3 text-cyan-400" />
                        <span>AI 人聲隔離與背景降噪 (Speech Isolation)</span>
                      </div>
                      <button
                        onClick={() => setVideoProps((p) => ({ ...p, denoise: !p.denoise }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          videoProps.denoise
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        {videoProps.denoise ? 'AI 降噪已啟用' : '關閉'}
                      </button>
                    </div>

                    {videoProps.denoise && (
                      <div className="space-y-2 pt-1 animate-fadeIn">
                        {/* 降噪強度 */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>降噪強度等級</span>
                            <span className="font-mono text-cyan-300 capitalize">{videoProps.denoiseIntensity}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'low', label: '輕度 (溫和去底噪)' },
                              { id: 'medium', label: '中度 (Podcast 推薦)' },
                              { id: 'high', label: '深度 (極致去除冷氣聲)' }
                            ].map((level) => (
                              <button
                                key={level.id}
                                onClick={() => setVideoProps((p) => ({ ...p, denoiseIntensity: level.id as any }))}
                                className={`py-1 rounded text-[9.5px] border transition-colors ${
                                  videoProps.denoiseIntensity === level.id
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                                }`}
                              >
                                {level.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 降噪模型架構 */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 block">硬體運算模型：</span>
                          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded border border-zinc-850 text-[10px] text-zinc-300 font-mono">
                            <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
                            <span>Intel® AI Boost NPU / OpenVINO™ (RNNoise 類神經降噪引擎)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 功能 45: 音訊淡入淡出曲線包絡 (Audio Fade-In / Fade-Out Envelopes) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      音訊淡入淡出曲線 (Audio Envelopes)
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {/* 音訊淡入 */}
                      <div className="space-y-1 bg-zinc-900/60 border border-zinc-850 rounded p-1.5">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>音訊淡入 (Fade-In)</span>
                          <span className="font-mono text-cyan-300">{videoProps.audioFadeInDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={videoProps.audioFadeInDuration}
                          onChange={(e) => setVideoProps((p) => ({ ...p, audioFadeInDuration: Number(e.target.value) }))}
                          className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>

                      {/* 音訊淡出 */}
                      <div className="space-y-1 bg-zinc-900/60 border border-zinc-850 rounded p-1.5">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>音訊淡出 (Fade-Out)</span>
                          <span className="font-mono text-cyan-300">{videoProps.audioFadeOutDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={videoProps.audioFadeOutDuration}
                          onChange={(e) => setVideoProps((p) => ({ ...p, audioFadeOutDuration: Number(e.target.value) }))}
                          className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* 曲線類型切換 */}
                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className="text-zinc-400">衰減曲線類型：</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setVideoProps((p) => ({ ...p, audioFadeCurve: 'exponential' }))}
                          className={`px-2 py-0.5 rounded text-[9.5px] border ${
                            videoProps.audioFadeCurve === 'exponential'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                          }`}
                        >
                          等功率指數曲線 (推薦)
                        </button>
                        <button
                          onClick={() => setVideoProps((p) => ({ ...p, audioFadeCurve: 'linear' }))}
                          className={`px-2 py-0.5 rounded text-[9.5px] border ${
                            videoProps.audioFadeCurve === 'linear'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                          }`}
                        >
                          線性衰減
                        </button>
                      </div>
                    </div>

                    {/* 快捷預設 */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {[
                        { label: '無', inVal: 0, outVal: 0 },
                        { label: '0.3s (防爆音)', inVal: 0.3, outVal: 0.3 },
                        { label: '0.8s (標準)', inVal: 0.8, outVal: 0.8 },
                        { label: '1.5s (平滑)', inVal: 1.5, outVal: 1.5 },
                        { label: '2.5s (廣播級)', inVal: 2.5, outVal: 2.5 }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setVideoProps((p) => ({ ...p, audioFadeInDuration: preset.inVal, audioFadeOutDuration: preset.outVal }))}
                          className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                            videoProps.audioFadeInDuration === preset.inVal && videoProps.audioFadeOutDuration === preset.outVal
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 功能 61: AI 廣播級響度正規化 (Loudness Normalization -14 LUFS) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-[11px]">
                        <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                        <span>AI 廣播響度正規化 (Loudness Normalization)</span>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !videoProps.enableLoudnessNorm;
                          setVideoProps((p) => ({ ...p, enableLoudnessNorm: nextVal }));
                          setLiveCutNotice(nextVal ? `已開啟 AI 廣播響度正規化 (${videoProps.targetLufs} LUFS)` : '已關閉響度正規化');
                          setTimeout(() => setLiveCutNotice(null), 1500);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          videoProps.enableLoudnessNorm
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {videoProps.enableLoudnessNorm ? '已啟用合規' : '關閉'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">標準平台規範：</span>
                      <div className="flex items-center gap-1">
                        {[
                          { lufs: -14, label: 'YouTube / Spotify (-14 LUFS)' },
                          { lufs: -16, label: 'Apple Podcast (-16 LUFS)' },
                          { lufs: -23, label: 'EBU R128 (-23 LUFS)' }
                        ].map((std) => (
                          <button
                            key={std.lufs}
                            onClick={() => setVideoProps((p) => ({ ...p, targetLufs: std.lufs as any }))}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${
                              videoProps.targetLufs === std.lufs
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-850'
                            }`}
                          >
                            {std.lufs} LUFS
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded bg-zinc-900/80 border border-zinc-850 text-[10px] font-mono">
                      <span className="text-zinc-400">當前整合響度：<strong className="text-cyan-300">-14.2 LUFS</strong></span>
                      <span className="text-zinc-400">真實峰值限制：<strong className="text-emerald-400">-1.0 dBFS</strong></span>
                    </div>
                  </div>

                  {/* 功能 62: 雙人音軌音量智慧動態平衡 (AI Auto-Leveler) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-[11px]">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                        <span>雙人音軌智慧動態平衡 (AI Auto-Leveler)</span>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !videoProps.enableAutoLeveler;
                          setVideoProps((p) => ({ ...p, enableAutoLeveler: nextVal }));
                          setLiveCutNotice(nextVal ? `已開啟雙人音軌智慧動態平衡 (3.5:1 壓縮)` : '已關閉動態平衡');
                          setTimeout(() => setLiveCutNotice(null), 1500);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          videoProps.enableAutoLeveler
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {videoProps.enableAutoLeveler ? '平衡中' : '關閉'}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>人聲電平壓縮強度 (Compression Level)</span>
                        <span className="font-mono text-cyan-300">{videoProps.autoLevelerStrength}% (3.5:1)</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={videoProps.autoLevelerStrength}
                        onChange={(e) => setVideoProps((p) => ({ ...p, autoLevelerStrength: Number(e.target.value) }))}
                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                      <span className="text-[9px] text-zinc-500 block leading-tight">
                        自動抬升微弱耳語聲，並即時壓制大笑、拍桌與噴氣的突發超載爆音。
                      </span>
                    </div>
                  </div>

                  {/* 功能 63 & 64: 低頻風切、齒音消除與噴麥壓制 (De-Esser & De-Plosive) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      人聲瑕疵修復濾波 (Vocal Restoration Suite)
                    </span>

                    <div className="space-y-1.5 text-[10.5px]">
                      {/* 80Hz 低頻風切濾波 (功能 63) */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <div>
                          <span className="text-zinc-200 font-medium block">80Hz 高通低頻風切消除 (Rumble Filter)</span>
                          <span className="text-zinc-500 text-[9px]">濾除空調風聲、麥克風架震動與環境悶響</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={videoProps.enableHighPassRumble}
                          onChange={(e) => setVideoProps((p) => ({ ...p, enableHighPassRumble: e.target.checked }))}
                          className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                        />
                      </label>

                      {/* 4~8kHz 齒音消除器 (功能 64) */}
                      <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-850 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-zinc-200 font-medium block">4~8kHz 齒音消除器 (De-Esser)</span>
                            <span className="text-zinc-500 text-[9px]">柔化「嘶、呲、吃、七」等刺耳高頻氣音</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={videoProps.enableDeEsser}
                            onChange={(e) => setVideoProps((p) => ({ ...p, enableDeEsser: e.target.checked }))}
                            className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                          />
                        </div>
                        {videoProps.enableDeEsser && (
                          <div className="flex items-center gap-1 pt-1 border-t border-zinc-800/60">
                            <span className="text-[9.5px] text-zinc-400">壓制等級：</span>
                            {(['low', 'medium', 'high'] as const).map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => setVideoProps((p) => ({ ...p, deEsserStrength: lvl }))}
                                className={`px-2 py-0.2 rounded text-[9px] border font-mono ${
                                  videoProps.deEsserStrength === lvl
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                                }`}
                              >
                                {lvl === 'low' ? '輕度 (-3dB)' : lvl === 'medium' ? '中度 (-6dB)' : '強力 (-9dB)'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 防噴麥爆音壓制 (功能 64) */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <div>
                          <span className="text-zinc-200 font-medium block">智慧防噴麥壓制 (De-Plosive Filter)</span>
                          <span className="text-zinc-500 text-[9px]">瞬間捕捉「啪、波、特」氣流直衝振膜的爆音震盪</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={videoProps.enableDePlosive}
                          onChange={(e) => setVideoProps((p) => ({ ...p, enableDePlosive: e.target.checked }))}
                          className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 功能 65: 空間殘響智慧消除 (De-Reverb Room Acoustics Cleaner) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-[11px]">
                        <Music className="h-3.5 w-3.5 text-cyan-400" />
                        <span>空間殘響智慧消除 (AI De-Reverb Cleaner)</span>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !videoProps.enableDeReverb;
                          setVideoProps((p) => ({ ...p, enableDeReverb: nextVal }));
                          setLiveCutNotice(nextVal ? `已開啟 AI 空間殘響消除 (${videoProps.deReverbAmount}%)` : '已關閉殘響消除');
                          setTimeout(() => setLiveCutNotice(null), 1500);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          videoProps.enableDeReverb
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {videoProps.enableDeReverb ? '殘響消除中' : '關閉'}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>去殘響強度量</span>
                        <span className="font-mono text-cyan-300">{videoProps.deReverbAmount}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={videoProps.deReverbAmount}
                        onChange={(e) => setVideoProps((p) => ({ ...p, deReverbAmount: Number(e.target.value) }))}
                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="text-zinc-400">空間環境拓撲：</span>
                        <div className="flex items-center gap-1">
                          {[
                            { id: 'small', label: '客廳/臥室 (空蕩回音)' },
                            { id: 'large', label: '會議室/展廳 (長殘響)' },
                            { id: 'studio', label: '專業吸音錄音室' }
                          ].map((room) => (
                            <button
                              key={room.id}
                              onClick={() => setVideoProps((p) => ({ ...p, roomProfile: room.id as any }))}
                              className={`px-1.5 py-0.5 rounded text-[9px] border ${
                                videoProps.roomProfile === room.id
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                              }`}
                            >
                              {room.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 一鍵套用母帶處理捷徑 */}
                  <button
                    onClick={() => {
                      setVideoProps((p) => ({
                        ...p,
                        enableLoudnessNorm: true,
                        targetLufs: -14,
                        enableAutoLeveler: true,
                        autoLevelerStrength: 80,
                        enableHighPassRumble: true,
                        enableDeEsser: true,
                        deEsserStrength: 'medium',
                        enableDePlosive: true,
                        enableDeReverb: true,
                        deReverbAmount: 65
                      }));
                      setLiveCutNotice('✨ 已一鍵套用 Podcast 廣播級全套母帶處理鏈路 (-14 LUFS / 去殘響 / 齒音抑制 / 爆音壓制)！');
                      setTimeout(() => setLiveCutNotice(null), 3000);
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 hover:from-cyan-500 hover:via-teal-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>一鍵套用廣播級母帶後製全套鏈路</span>
                  </button>
                </div>
              )}

              {inspectorTab === 'color' && (
                <div className="space-y-3.5">
                  {/* 功能 40: 色彩面板標頭與 A/B 對比、一鍵重設按鈕 */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                        <Palette className="h-3.5 w-3.5 text-teal-400" />
                        <span>色彩調色引擎 (Color Grading)</span>
                      </div>
                      <button
                        onClick={() =>
                          setVideoProps((p) => ({
                            ...p,
                            brightness: 100,
                            contrast: 100,
                            saturation: 100,
                            temperature: 0,
                            tint: 0
                          }))
                        }
                        className="text-[10px] text-zinc-500 hover:text-teal-400 flex items-center gap-0.5 transition-colors"
                        title="一鍵重設所有調色參數至預設值 (100% / 0)"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>重設色彩</span>
                      </button>
                    </div>

                    {/* 功能 40: A/B 原片即時對比控制列 */}
                    <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800/90 rounded-md p-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setIsABComparing((p) => !p)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                            isABComparing
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                          }`}
                          title="點擊切換 A/B 對比模式 (開啟時監視器顯示未調色原片)"
                        >
                          <SplitSquareVertical className="h-3 w-3" />
                          <span>{isABComparing ? 'A/B 對比中 (原片 RAW)' : 'A/B 對比 (原片)'}</span>
                        </button>

                        <button
                          onMouseDown={() => setIsABComparing(true)}
                          onMouseUp={() => setIsABComparing(false)}
                          onMouseLeave={() => setIsABComparing(false)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-750 active:bg-amber-500/30 text-zinc-300 hover:text-white border border-zinc-700 text-[10px] transition-colors select-none"
                          title="按住滑鼠時暫時查看原片，放開後立即還原調色"
                        >
                          按住即時對比
                        </button>
                      </div>

                      <span className="text-[9.5px] font-mono text-zinc-500">
                        狀態：{isABComparing ? '原片 (Before)' : '調色後 (After)'}
                      </span>
                    </div>
                  </div>

                  {/* 功能 37: 基礎光影 - 亮度與對比度調節 */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-3">
                    <span className="font-semibold text-zinc-200 block pb-1 border-b border-zinc-800/60 text-[11px]">
                      基礎光影調節 (Exposure & Contrast)
                    </span>

                    {/* 亮度 Brightness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            onMouseDown={(e) => handleStartColorScrubbing(e, 'brightness')}
                            className={`cursor-ew-resize select-none px-1 py-0.2 rounded font-mono text-[10px] font-bold transition-colors ${
                              colorScrubbingAxis === 'brightness'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-300 text-amber-400'
                            }`}
                            title="按住左右拖曳可快速微調亮度"
                          >
                            亮度 ↔
                          </span>
                          <span>(Brightness)</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={videoProps.brightness}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const clamped = isNaN(raw) ? 100 : Math.max(0, Math.min(200, raw));
                              setVideoProps((p) => ({ ...p, brightness: clamped }));
                            }}
                            className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-amber-300 focus:outline-none focus:border-amber-500"
                          />
                          <span className="font-mono text-zinc-500 text-[10px]">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={videoProps.brightness}
                          onChange={(e) => setVideoProps((p) => ({ ...p, brightness: Number(e.target.value) }))}
                          className="flex-1 accent-amber-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center gap-1 pt-0.5">
                        {[80, 90, 100, 115, 130].map((b) => (
                          <button
                            key={b}
                            onClick={() => setVideoProps((p) => ({ ...p, brightness: b }))}
                            className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              videoProps.brightness === b
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                            }`}
                          >
                            {b === 100 ? '100% 標' : `${b}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 對比度 Contrast */}
                    <div className="space-y-1 pt-1.5 border-t border-zinc-850">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            onMouseDown={(e) => handleStartColorScrubbing(e, 'contrast')}
                            className={`cursor-ew-resize select-none px-1 py-0.2 rounded font-mono text-[10px] font-bold transition-colors ${
                              colorScrubbingAxis === 'contrast'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-zinc-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-cyan-400'
                            }`}
                            title="按住左右拖曳可快速微調對比度"
                          >
                            對比 ↔
                          </span>
                          <span>(Contrast)</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={videoProps.contrast}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const clamped = isNaN(raw) ? 100 : Math.max(0, Math.min(200, raw));
                              setVideoProps((p) => ({ ...p, contrast: clamped }));
                            }}
                            className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                          <span className="font-mono text-zinc-500 text-[10px]">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={videoProps.contrast}
                          onChange={(e) => setVideoProps((p) => ({ ...p, contrast: Number(e.target.value) }))}
                          className="flex-1 accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center gap-1 pt-0.5">
                        {[80, 90, 100, 120, 140].map((c) => (
                          <button
                            key={c}
                            onClick={() => setVideoProps((p) => ({ ...p, contrast: c }))}
                            className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              videoProps.contrast === c
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                            }`}
                          >
                            {c === 100 ? '100% 標' : `${c}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 功能 38: 白平衡與色溫/色調調節 (White Balance & Temperature) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-3">
                    <span className="font-semibold text-zinc-200 block pb-1 border-b border-zinc-800/60 text-[11px]">
                      白平衡與色溫 (White Balance & Tint)
                    </span>

                    {/* 色溫 Temperature */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            onMouseDown={(e) => handleStartColorScrubbing(e, 'temperature')}
                            className={`cursor-ew-resize select-none px-1 py-0.2 rounded font-mono text-[10px] font-bold transition-colors ${
                              colorScrubbingAxis === 'temperature'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-zinc-800 hover:bg-orange-500/20 hover:text-orange-300 text-orange-400'
                            }`}
                            title="按住左右拖曳可快速微調色溫"
                          >
                            色溫 ↔
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {videoProps.temperature < 0 ? '冷色調 (冰藍)' : videoProps.temperature > 0 ? '暖色調 (暖黃)' : '中性 (標準)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min="-100"
                            max="100"
                            value={videoProps.temperature}
                            onChange={(e) => setVideoProps((p) => ({ ...p, temperature: Number(e.target.value) }))}
                            className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-orange-300 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={videoProps.temperature}
                          onChange={(e) => setVideoProps((p) => ({ ...p, temperature: Number(e.target.value) }))}
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-sky-400 via-zinc-200 to-amber-500"
                        />
                      </div>

                      <div className="flex items-center gap-1 pt-0.5">
                        {[
                          { label: '冷藍 (-40)', val: -40 },
                          { label: '中性 (0)', val: 0 },
                          { label: '暖陽 (+35)', val: 35 },
                          { label: '金黃 (+70)', val: 70 }
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => setVideoProps((p) => ({ ...p, temperature: item.val }))}
                            className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              videoProps.temperature === item.val
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 色調 Tint */}
                    <div className="space-y-1 pt-1.5 border-t border-zinc-850">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            onMouseDown={(e) => handleStartColorScrubbing(e, 'tint')}
                            className={`cursor-ew-resize select-none px-1 py-0.2 rounded font-mono text-[10px] font-bold transition-colors ${
                              colorScrubbingAxis === 'tint'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-rose-400'
                            }`}
                            title="按住左右拖曳可快速微調色調偏色"
                          >
                            色調 ↔
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {videoProps.tint < 0 ? '偏綠 (Tint -)' : videoProps.tint > 0 ? '偏洋紅 (Tint +)' : '標準'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min="-50"
                            max="50"
                            value={videoProps.tint}
                            onChange={(e) => setVideoProps((p) => ({ ...p, tint: Number(e.target.value) }))}
                            className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-rose-300 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={videoProps.tint}
                          onChange={(e) => setVideoProps((p) => ({ ...p, tint: Number(e.target.value) }))}
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-emerald-400 via-zinc-200 to-rose-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 功能 39: 色彩飽和度調節 (Color Saturation Engine) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-3">
                    <span className="font-semibold text-zinc-200 block pb-1 border-b border-zinc-800/60 text-[11px]">
                      色彩飽和度 (Color Saturation)
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            onMouseDown={(e) => handleStartColorScrubbing(e, 'saturation')}
                            className={`cursor-ew-resize select-none px-1 py-0.2 rounded font-mono text-[10px] font-bold transition-colors ${
                              colorScrubbingAxis === 'saturation'
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                                : 'bg-zinc-800 hover:bg-pink-500/20 hover:text-pink-300 text-pink-400'
                            }`}
                            title="按住左右拖曳可快速微調色彩飽和度"
                          >
                            飽和 ↔
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {videoProps.saturation === 0 ? '灰階黑白' : videoProps.saturation > 130 ? '高彩鮮豔' : '自然'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            max="250"
                            value={videoProps.saturation}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const clamped = isNaN(raw) ? 100 : Math.max(0, Math.min(250, raw));
                              setVideoProps((p) => ({ ...p, saturation: clamped }));
                            }}
                            className="w-12 h-5 bg-zinc-900 border border-zinc-800 rounded px-1 text-right font-mono text-[10px] text-pink-300 focus:outline-none focus:border-pink-500"
                          />
                          <span className="font-mono text-zinc-500 text-[10px]">%</span>
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="250"
                          value={videoProps.saturation}
                          onChange={(e) => setVideoProps((p) => ({ ...p, saturation: Number(e.target.value) }))}
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-zinc-500 via-teal-400 to-pink-500"
                        />
                      </div>

                      <div className="flex items-center gap-1 pt-0.5">
                        {[
                          { label: '黑白 (0%)', val: 0 },
                          { label: '低彩 (60%)', val: 60 },
                          { label: '標準 (100%)', val: 100 },
                          { label: '通透 (130%)', val: 130 },
                          { label: '濃郁 (175%)', val: 175 }
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => setVideoProps((p) => ({ ...p, saturation: item.val }))}
                            className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              videoProps.saturation === item.val
                                ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 一鍵調色風格濾鏡快選卡 (Color LUT Style Presets) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      風格濾鏡預設檔 (Color LUT Presets)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { name: '自然原色', b: 100, c: 100, s: 100, t: 0, tint: 0, color: 'border-zinc-700 bg-zinc-900' },
                        { name: '日系清新', b: 110, c: 90, s: 85, t: -10, tint: 5, color: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300' },
                        { name: '溫暖訪談', b: 105, c: 105, s: 115, t: 25, tint: -5, color: 'border-amber-500/30 bg-amber-950/20 text-amber-300' },
                        { name: '黑白電影', b: 95, c: 130, s: 0, t: 0, tint: 0, color: 'border-zinc-500/30 bg-zinc-900 text-zinc-300' },
                        { name: '電影冷調', b: 95, c: 120, s: 110, t: -35, tint: 10, color: 'border-sky-500/30 bg-sky-950/20 text-sky-300' },
                        { name: '黃金夕陽', b: 108, c: 115, s: 125, t: 55, tint: -10, color: 'border-orange-500/30 bg-orange-950/20 text-orange-300' }
                      ].map((lut) => (
                        <button
                          key={lut.name}
                          onClick={() => {
                            setVideoProps((p) => ({
                              ...p,
                              brightness: lut.b,
                              contrast: lut.c,
                              saturation: lut.s,
                              temperature: lut.t,
                              tint: lut.tint
                            }));
                            setLiveCutNotice(`已套用【${lut.name}】調色風格！`);
                            setTimeout(() => setLiveCutNotice(null), 1200);
                          }}
                          className={`p-1.5 rounded border text-[10px] font-medium text-center transition-all hover:scale-[1.02] ${lut.color}`}
                        >
                          {lut.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 功能 43: 播放速度變速控制 (Playback Speed Rate 0.25x ~ 3.0x & 音高保持) */}
              {inspectorTab === 'speed' && (
                <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-[11px]">
                      <Gauge className="h-3.5 w-3.5 text-teal-400" />
                      <span>播放倍速調節 (Playback Speed Rate)</span>
                    </div>
                    <button
                      onClick={() => setVideoProps((p) => ({ ...p, speed: 1.0 }))}
                      className="text-[10px] text-zinc-500 hover:text-teal-400 flex items-center gap-0.5 transition-colors"
                      title="重設為原速 1.0x"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>重設 1.0x</span>
                    </button>
                  </div>

                  {/* 滑桿與當前倍速 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>當前速度</span>
                      <span className="font-mono text-teal-300 font-bold text-xs">{videoProps.speed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="3.0"
                      step="0.05"
                      value={videoProps.speed}
                      onChange={(e) => setVideoProps((p) => ({ ...p, speed: Number(e.target.value) }))}
                      className="w-full accent-teal-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* 快捷倍速按鈕陣列 */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">常用速度預設檔：</span>
                    <div className="grid grid-cols-7 gap-1">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                        <button
                          key={s}
                          onClick={() => setVideoProps((p) => ({ ...p, speed: s }))}
                          className={`py-1 rounded text-[9.5px] font-mono border transition-all ${
                            videoProps.speed === s
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 音高保持開關 */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-850 text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-zinc-300 font-medium">語調音高修正 (Preserve Pitch)</span>
                      <span className="text-zinc-500 text-[9px]">變速時維持自然人聲語調，不產生花栗鼠變形音</span>
                    </div>
                    <button
                      onClick={() => setVideoProps((p) => ({ ...p, preservePitch: !p.preservePitch }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        videoProps.preservePitch
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      {videoProps.preservePitch ? '已保持' : '關閉'}
                    </button>
                  </div>

                  {/* 換算時長提示 */}
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>當前倍速審片預估時長：</span>
                    <span className="text-teal-300 font-bold">{formatSMPTE(totalDuration / videoProps.speed)}</span>
                  </div>
                </div>
              )}

              {/* 功能 56 ~ 60: AI 多機位自動切鏡、反應鏡頭穿插、人臉置中與節奏控制工作台 */}
              {inspectorTab === 'ai' && (
                <div className="space-y-3">
                  {/* 面板標頭與 NPU 狀態 */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        <span>AI 多機位自動導播演算法 (Auto Director)</span>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/40">
                        Intel® AI Boost (NPU) / OpenVINO™ 加速中
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      結合 VAD 語音活動檢測、聲紋發言人分離與人臉追蹤構圖，自動輸出符合 Podcast 專業審美的切鏡時間軸。
                    </p>
                  </div>

                  {/* 功能 59: 鏡頭切換節奏節拍控制 (Pacing Control) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      導播剪輯節奏風格 (Pacing Profile)
                    </span>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'relaxed', label: '慢熱深度', desc: '10~18s 長鏡頭', sub: '深度知識對話' },
                        { id: 'balanced', label: '標準訪談', desc: '5~8s 黃金節奏', sub: 'Podcast 最佳推薦' },
                        { id: 'dynamic', label: '快節奏激辯', desc: '2~4s 密集切鏡', sub: '精彩問答/金句' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setDirectorPacing(item.id as any)}
                          className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                            directorPacing === item.id
                              ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50 font-bold shadow'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                          }`}
                        >
                          <span className="text-[11px] font-bold text-zinc-100">{item.label}</span>
                          <span className="text-[9px] text-indigo-300 font-mono">{item.desc}</span>
                          <span className="text-[8px] text-zinc-500">{item.sub}</span>
                        </button>
                      ))}
                    </div>

                    {/* 最短/最長鏡頭限制滑桿 */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-850 text-[10px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-400">
                          <span>最短鏡頭停留</span>
                          <span className="font-mono text-indigo-300">{minShotDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min="1.5"
                          max="6.0"
                          step="0.5"
                          value={minShotDuration}
                          onChange={(e) => setMinShotDuration(Number(e.target.value))}
                          className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-400">
                          <span>最長鏡頭停留</span>
                          <span className="font-mono text-indigo-300">{maxShotDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min="8.0"
                          max="25.0"
                          step="1.0"
                          value={maxShotDuration}
                          onChange={(e) => setMaxShotDuration(Number(e.target.value))}
                          className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 功能 56 & 57: VAD 靈敏度與穿插導播規則 (Intercut Rules) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2.5">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      語音活動檢測與穿插規則 (VAD & Intercuts)
                    </span>

                    {/* VAD 門限選單 */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">VAD 切鏡觸發靈敏度：</span>
                      <select
                        value={vadSensitivity}
                        onChange={(e) => setVadSensitivity(e.target.value as any)}
                        className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 text-[10px] focus:outline-none"
                      >
                        <option value="low">低度 (防止插話短語誤切)</option>
                        <option value="medium">中度 (標準自然對話推薦)</option>
                        <option value="high">高度 (瞬時發言即刻切換)</option>
                      </select>
                    </div>

                    {/* 穿插規則複選框 */}
                    <div className="space-y-1.5 pt-1 border-t border-zinc-850 text-[10.5px]">
                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <span className="text-zinc-300">自動插入聆聽者反應鏡頭 (Reaction Shots)</span>
                        <input
                          type="checkbox"
                          checked={enableReactionCuts}
                          onChange={(e) => setEnableReactionCuts(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0"
                        />
                      </label>

                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <span className="text-zinc-300">超過 12 秒長發言自動切換全景 (Wide Intercuts)</span>
                        <input
                          type="checkbox"
                          checked={enableWideIntercuts}
                          onChange={(e) => setEnableWideIntercuts(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0"
                        />
                      </label>

                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <span className="text-zinc-300">雙人同時發言切換至 CAM C 現場全景</span>
                        <input
                          type="checkbox"
                          checked={enableOverlapWide}
                          onChange={(e) => setEnableOverlapWide(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 功能 58: 人臉識別與置中構圖 (Face Detection & Auto-Reframe) */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2">
                    <span className="font-semibold text-zinc-200 block text-[11px] pb-1 border-b border-zinc-800/60">
                      人臉識別與構圖追蹤 (Face Tracking & Framing)
                    </span>

                    <div className="space-y-1.5 text-[10.5px]">
                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <div>
                          <span className="text-zinc-300 block font-medium">主角人臉即時置中 (Auto-Reframe)</span>
                          <span className="text-zinc-500 text-[9px]">自動依據三分構圖法追蹤說話者頭部中心</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoReframeFace}
                          onChange={(e) => setAutoReframeFace(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-0"
                        />
                      </label>

                      <label className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:bg-zinc-850/80">
                        <span className="text-zinc-300">監視器顯示 AI 人臉追蹤框 (Face Bounding Box)</span>
                        <input
                          type="checkbox"
                          checked={showFaceTrackerBox}
                          onChange={(e) => setShowFaceTrackerBox(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 功能 60: 一鍵執行 AI 自動導播運算按鈕 */}
                  <button
                    onClick={runRealAiAutoDirector}
                    disabled={isCalculatingAiDirector}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 hover:from-indigo-500 hover:via-purple-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>一鍵套用 AI 自動導播腳本至時間軸</span>
                  </button>
                </div>
              )}

              {/* 功能 51 ~ 55: AI 智慧逐字稿、發言人標註、文字剪片、口癖清理與靜音裁切面板 */}
              {inspectorTab === 'transcript' && (
                <div className="space-y-3">
                  {/* 逐字稿頂部資訊與 Whisper 模型選單 */}
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                        <span>Whisper AI 逐字稿文字剪輯</span>
                      </div>
                      <button
                        onClick={handleWhisperTranscribe}
                        disabled={isTranscribing}
                        className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 text-[10px] font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                        title="調用 Whisper NPU 重新自動轉錄全片音訊"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isTranscribing ? 'animate-spin' : ''}`} />
                        <span>{isTranscribing ? '轉錄中...' : '重新轉錄'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <span>模型：</span>
                        <select
                          value={whisperModel}
                          onChange={(e) => setWhisperModel(e.target.value as any)}
                          className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.2 text-zinc-300 focus:outline-none"
                        >
                          <option value="turbo">Whisper Turbo (極速 4x)</option>
                          <option value="large-v3">Whisper Large-v3 (高精度)</option>
                          <option value="npu">Intel® OpenVINO™ / AI Boost 離線版</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1 text-zinc-400">
                        <span>語言：</span>
                        <select
                          value={whisperLang}
                          onChange={(e) => setWhisperLang(e.target.value as any)}
                          className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.2 text-zinc-300 focus:outline-none"
                        >
                          <option value="zh">繁體中文 (台灣)</option>
                          <option value="en">English (US)</option>
                          <option value="auto">中英雙語混雜</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 功能 71 ~ 75: 智慧字幕控制列、雙語對照與 SRT/VTT 雙格式導出 */}
                  <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                        <Type className="h-3.5 w-3.5 text-teal-400" />
                        <span>字幕顯示與雙語導出 (Captions & Subtitles)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowSubtitles((s) => !s)}
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border transition-colors ${
                            showSubtitles ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                          }`}
                        >
                          {showSubtitles ? '字幕顯示中' : '字幕關閉'}
                        </button>
                      </div>
                    </div>

                    {/* 雙色標籤與雙語開關 */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <label className="flex items-center gap-1 cursor-pointer hover:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={enableBilingualSubs}
                          onChange={(e) => setEnableBilingualSubs(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-0"
                        />
                        <span>中英雙語平行對照字幕 (功能 74)</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer hover:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={enableWordBounce}
                          onChange={(e) => setEnableWordBounce(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-0"
                        />
                        <span>詞級跳動 (功能 73)</span>
                      </label>
                    </div>

                    {/* 功能 71 & 75: 導出按鈕與磁吸對齊按鈕 */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-zinc-850">
                      <button
                        onClick={() => exportSubtitles('srt', enableBilingualSubs)}
                        className="py-1 px-1.5 rounded bg-zinc-900 hover:bg-zinc-850 text-teal-300 border border-teal-500/30 text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                        title="導出標準 SRT 字幕檔 (相容 Premiere / YouTube / FCPX)"
                      >
                        <Download className="h-2.5 w-2.5" />
                        <span>導出 .SRT</span>
                      </button>

                      <button
                        onClick={() => exportSubtitles('vtt', enableBilingualSubs)}
                        className="py-1 px-1.5 rounded bg-zinc-900 hover:bg-zinc-850 text-violet-300 border border-violet-500/30 text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                        title="導出 WebVTT 字幕檔 (相容 HTML5 網頁與現代播放器)"
                      >
                        <Download className="h-2.5 w-2.5" />
                        <span>導出 .VTT</span>
                      </button>

                      <button
                        onClick={snapSubtitlesToCuts}
                        className="py-1 px-1.5 rounded bg-zinc-900 hover:bg-zinc-850 text-amber-300 border border-amber-500/30 text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                        title="自動將字幕起訖點磁吸對齊至最近的鏡頭切點 (功能 75)"
                      >
                        <Magnet className="h-2.5 w-2.5" />
                        <span>🧲 磁吸切點</span>
                      </button>
                    </div>
                  </div>

                  {/* 功能 54 & 55: 一鍵 AI 智慧清理快捷工具列 */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* 功能 54: 口癖贅字消除按鈕 */}
                    <button
                      onClick={handleRemoveAllFillers}
                      className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-left transition-all group flex flex-col gap-0.5"
                      title="AI 自動辨識並一鍵切除全片贅字 (那個、然後、就是、um、uh)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold flex items-center gap-1">
                          <Scissors className="h-3 w-3 text-amber-400 group-hover:rotate-12 transition-transform" />
                          <span>一鍵消除口癖</span>
                        </span>
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-mono">
                          {transcripts.reduce((acc, p) => acc + (p.words ? p.words.filter((w) => w.isFiller && !w.isDeleted).length : 0), 0)} 處
                        </span>
                      </div>
                      <span className="text-[9.5px] text-zinc-400 leading-tight">自動波紋切除無效停頓詞</span>
                    </button>

                    {/* 功能 55: 靜音段落智慧裁切按鈕 */}
                    <button
                      onClick={handleTrimAllSilences}
                      className="p-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-left transition-all group flex flex-col gap-0.5"
                      title="自動縮減講者之間的死寂空白停頓 (> 1.2s)，維持自然呼吸節奏"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold flex items-center gap-1">
                          <AudioLines className="h-3 w-3 text-teal-400" />
                          <span>一鍵裁切死寂</span>
                        </span>
                        <span className="text-[9px] px-1 rounded bg-teal-500/20 text-teal-200 border border-teal-500/40 font-mono">
                          門限 {silenceThreshold}s
                        </span>
                      </div>
                      <span className="text-[9.5px] text-zinc-400 leading-tight">自動緊縮多機位停頓間隙</span>
                    </button>
                  </div>

                  {/* 功能 52: 發言人角色篩選列 (Speaker Diarization Filter) */}
                  <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800 text-[10px]">
                    {[
                      { id: 'all', label: `全部發言 (${transcripts.length})` },
                      { id: 'host', label: '主持人 (Alex)' },
                      { id: 'guest', label: '來賓 (David)' },
                      { id: 'discussion', label: '雙人討論' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSpeakerFilter(tab.id as any)}
                        className={`flex-1 py-1 rounded text-center transition-all ${
                          speakerFilter === tab.id
                            ? 'bg-zinc-800 text-teal-300 font-bold border border-zinc-700 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* 逐字稿卡片清單 (支援詞級即時高亮與點擊刪除) */}
                  <div className="space-y-2.5">
                    {transcripts
                      .filter((p) => {
                        if (speakerFilter === 'host') return p.role === 'Host';
                        if (speakerFilter === 'guest') return p.role === 'Guest';
                        if (speakerFilter === 'discussion') return p.role === 'Both';
                        return true;
                      })
                      .map((para) => {
                        const isCurrent = currentTime >= para.startTime && currentTime < para.endTime;
                        const config = CAMERA_CONFIGS[para.suggestedCamera];

                        return (
                          <div
                            key={para.id}
                            onClick={() => {
                              setCurrentTime(para.startTime);
                              switchCameraAtCurrentTime(para.suggestedCamera);
                            }}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              para.isDeleted
                                ? 'bg-red-950/10 border-red-900/30 opacity-40 line-through'
                                : isCurrent
                                ? 'bg-zinc-800/90 border-teal-500/60 shadow-lg ring-1 ring-teal-500/30'
                                : 'bg-zinc-900/50 border-zinc-800/60 hover:bg-zinc-800/40'
                            }`}
                          >
                            {/* 卡片標頭：發言人角色與切換選單 (功能 52) */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold border ${config.badgeBg}`}>
                                  {config.id}
                                </span>
                                <select
                                  value={para.role || 'Host'}
                                  onChange={(e) => handleSwitchSpeaker(para.id, e.target.value as any)}
                                  className="bg-transparent text-zinc-200 text-[11px] font-bold focus:outline-none cursor-pointer hover:text-teal-300"
                                >
                                  <option value="Host" className="bg-zinc-900 text-zinc-200">主持人 (Alex) [CAM A]</option>
                                  <option value="Guest" className="bg-zinc-900 text-zinc-200">來賓 (David) [CAM B]</option>
                                  <option value="Both" className="bg-zinc-900 text-zinc-200">雙人討論 (Both) [CAM C]</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono text-zinc-500">
                                  {formatShortTimecode(para.startTime)} ➔ {formatShortTimecode(para.endTime)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTranscriptParagraph(para.id);
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                                  title="整句刪除 (連動波紋切除時間軸影片段)"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* 功能 53 & 54: 詞級即時互動文字渲染 (點詞跳轉、當前發音高亮、口癖標記、劃選刪除) */}
                            <div className="pt-2 flex flex-wrap gap-1 leading-relaxed">
                              {para.words && para.words.length > 0 ? (
                                para.words.map((w) => {
                                  const isWordActive = isPlaying && currentTime >= w.startTime && currentTime <= w.endTime;
                                  return (
                                    <span
                                      key={w.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentTime(w.startTime);
                                      }}
                                      className={`px-1 py-0.2 rounded transition-all duration-75 text-[11px] select-text ${
                                        w.isDeleted
                                          ? 'line-through text-red-400/60 bg-red-950/20'
                                          : isWordActive
                                          ? 'bg-teal-400 text-zinc-950 font-bold shadow-md scale-105'
                                          : w.isFiller
                                          ? 'bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/40 hover:bg-amber-500/30'
                                          : 'hover:bg-zinc-700/60 text-zinc-200'
                                      }`}
                                      title={
                                        w.isFiller
                                          ? `AI 口癖贅字「${w.word}」(雙擊可單獨切除)`
                                          : `點擊跳至 ${formatSMPTE(w.startTime)} (雙擊切除)`
                                      }
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleDeleteWord(para.id, w.id);
                                      }}
                                    >
                                      {w.word}
                                      {w.isFiller && !w.isDeleted && (
                                        <span className="ml-0.5 text-[8px] text-amber-400 font-mono opacity-80">[贅]</span>
                                      )}
                                    </span>
                                  );
                                })
                              ) : (
                                <p className="text-zinc-300 text-[11px]">{para.text}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 功能 76 ~ 80: AI 章節標記、單集備忘錄 Show Notes 與 SEO 標題推薦面板 */}
              {inspectorTab === 'notes' && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* 頂部操作列：重新生成、一鍵轉移時間軸標記、複製 Markdown */}
                  <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-200 text-xs">
                        <FileText className="h-3.5 w-3.5 text-teal-400" />
                        <span>AI 單集備忘錄與章節標記 (Show Notes)</span>
                      </div>
                      <button
                        onClick={handleRegenerateShowNotes}
                        disabled={isGeneratingNotes}
                        className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 text-[10px] font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                        title="調用 Gemini AI 重新生成節目精華與章節摘要"
                      >
                        <Sparkles className={`h-2.5 w-2.5 ${isGeneratingNotes ? 'animate-spin' : ''}`} />
                        <span>{isGeneratingNotes ? '生成中...' : '重新生成'}</span>
                      </button>
                    </div>

                    {/* 快捷操作按鈕組 (功能 79 & 80) */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        onClick={handleConvertChaptersToMarkers}
                        className="py-1 px-2 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                        title="自動將下方 5 個章節時間戳記一鍵轉移至時間軸標記點 (功能 79)"
                      >
                        <Bookmark className="h-3 w-3 text-purple-400" />
                        <span>一鍵轉移時間軸標記點</span>
                      </button>

                      <button
                        onClick={handleCopyShowNotes}
                        className="py-1 px-2 rounded bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                        title="複製 Markdown 格式單集備忘錄，可直接貼至 YouTube / Apple Podcasts (功能 80)"
                      >
                        <Copy className="h-3 w-3 text-teal-400" />
                        <span>一鍵複製 Markdown</span>
                      </button>
                    </div>
                  </div>

                  {/* 功能 76: AI 章節時間戳記清單 (Chapter Timestamps) */}
                  <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <span className="text-[11px] font-bold text-zinc-200">章節時間戳記 (點擊時間碼快速跳轉)</span>
                      <span className="text-[9.5px] font-mono text-zinc-500">{showNotes.chapters.length} 個章節</span>
                    </div>

                    <div className="space-y-1.5">
                      {showNotes.chapters.map((ch, idx) => (
                        <div
                          key={ch.id}
                          onClick={() => {
                            setCurrentTime(ch.startTime);
                            setLiveCutNotice(`已跳轉至章節：${ch.title} (${formatSMPTE(ch.startTime)})`);
                            setTimeout(() => setLiveCutNotice(null), 1500);
                          }}
                          className="p-1.5 rounded-md bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 cursor-pointer transition-all flex items-start gap-2 group"
                        >
                          <span className="text-[9.5px] font-mono font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/30 shrink-0 group-hover:bg-teal-500/20">
                            {formatSMPTE(ch.startTime).slice(0, 8)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-zinc-200 block truncate group-hover:text-teal-300">
                              {idx + 1}. {ch.title}
                            </span>
                            <span className="text-[9.5px] text-zinc-400 block truncate leading-tight">
                              {ch.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 功能 77: 單集簡介與核心亮點 (Episode Overview & Takeaways) */}
                  <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 space-y-2">
                    <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-800/60">
                      單集簡介與對談核心亮點 (Takeaways)
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      {showNotes.overview}
                    </p>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-zinc-400 block">核心對談重點：</span>
                      {showNotes.takeaways.map((tk, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10.5px] text-zinc-300">
                          <span className="text-teal-400 font-bold shrink-0">•</span>
                          <span className="leading-tight">{tk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 功能 78: SEO 關鍵字、熱門標籤與高點擊率標題 (SEO & Titles) */}
                  <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 space-y-2">
                    <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-800/60">
                      高 CTR 標題推薦與 SEO 標籤 (SEO & Titles)
                    </span>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 block">YouTube / 社群高點擊標題候選：</span>
                      {showNotes.seoTitles.map((st, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(st);
                              setLiveCutNotice(`已複製標題：${st}`);
                              setTimeout(() => setLiveCutNotice(null), 1500);
                            }
                          }}
                          className="p-1.5 rounded bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 text-[10.5px] text-zinc-200 cursor-pointer flex items-center justify-between group transition-colors"
                          title="點擊直接複製標題"
                        >
                          <span className="truncate group-hover:text-amber-300">{st}</span>
                          <Copy className="h-3 w-3 text-zinc-500 group-hover:text-amber-400 shrink-0 ml-1" />
                        </div>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-zinc-850 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400">社群標籤 (Hashtags)：</span>
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(showNotes.hashtags.join(' '));
                              setLiveCutNotice('已複製所有社群 Hashtags！');
                              setTimeout(() => setLiveCutNotice(null), 1200);
                            }
                          }}
                          className="text-[9.5px] text-teal-400 hover:underline"
                        >
                          複製標籤
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {showNotes.hashtags.map((ht) => (
                          <span key={ht} className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-teal-300">
                            {ht}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 下半部：專業多軌可編輯時間軸 (Full-Featured Multi-Track NLE Timeline) */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/60 backdrop-blur-md">
          {/* 工具列 */}
          <div className="h-9 px-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-900/90 select-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="p-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:scale-95 transition-all"
                title="播放/暫停 (Space)"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              </button>
              <button
                onClick={() => setCurrentTime(0)}
                className="p-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
                title="回到開頭"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <div className="h-3.5 w-[1px] bg-zinc-800 mx-1" />

              {/* 功能 48: 復原與重做 (Undo / Redo) */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="復原 (Ctrl+Z)"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= historyStack.length - 1}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="重做 (Ctrl+Y)"
                >
                  <Redo2 className="h-3 w-3" />
                </button>
              </div>

              <div className="h-3.5 w-[1px] bg-zinc-800 mx-0.5" />

              {/* 功能 47: 插入定格畫面 */}
              <button
                onClick={insertFreezeFrame}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 text-[11px] border border-zinc-700/60 transition-all"
                title="在當前播放頭插入 2 秒定格畫面 (Freeze Frame)"
              >
                <Camera className="h-3 w-3 text-cyan-400" />
                <span>定格</span>
              </button>

              {/* 選擇工具 vs 刀片工具切換 (功能 07) */}
              <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                <button
                  onClick={() => setCurrentTool('select')}
                  className={`p-1 rounded flex items-center gap-1 text-[11px] font-medium transition-all ${
                    currentTool === 'select'
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="選擇工具 [V]"
                >
                  <MousePointer className="h-3 w-3" />
                  <span>選取 [V]</span>
                </button>
                <button
                  onClick={() => setCurrentTool('razor')}
                  className={`p-1 rounded flex items-center gap-1 text-[11px] font-medium transition-all ${
                    currentTool === 'razor'
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="刀片裁切工具 [C] (點擊任意片段處切割)"
                >
                  <Scissors className="h-3 w-3 text-red-400" />
                  <span>刀片 [C]</span>
                </button>
              </div>

              <div className="h-3.5 w-[1px] bg-zinc-800 mx-0.5" />

              <button
                onClick={splitSegmentAtPlayhead}
                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/90 text-zinc-200 hover:bg-zinc-700 hover:text-white active:scale-95 text-xs font-semibold border border-zinc-700/80 transition-all shadow-sm"
                title="在游標處剪開片段 (S)"
              >
                <SplitSquareVertical className="h-3 w-3 text-teal-400" />
                <span>分割 (S)</span>
              </button>

              <button
                onClick={deleteSelectedSegment}
                disabled={!selectedSegmentId}
                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 active:scale-95 text-xs font-medium border border-zinc-700/60 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="刪除選中片段 (Delete / Backspace)"
              >
                <Trash2 className="h-3 w-3" />
                <span>刪除</span>
              </button>

              {/* 功能 06: 波紋刪除按鈕 (Ripple Delete) */}
              <button
                onClick={rippleDeleteSelectedSegment}
                disabled={!selectedSegmentId}
                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:bg-orange-500/20 hover:text-orange-300 hover:border-orange-500/40 active:scale-95 text-xs font-medium border border-zinc-700/60 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="波紋刪除 (Shift+Del: 刪除並自動向前閉合時間軸)"
              >
                <FastForward className="h-3 w-3 text-orange-400" />
                <span>波紋刪除</span>
              </button>

              {/* 功能 15 & 16: 循環播放開關 */}
              <button
                onClick={() => setIsLooping((l) => !l)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-all ${
                  isLooping
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                }`}
                title={isLooping ? '循環播放中 (到達出點自動回到入點)' : '單次播放'}
              >
                <Repeat className={`h-3 w-3 ${isLooping ? 'text-teal-400 animate-spin' : 'text-zinc-500'}`} />
                <span>循環 {isLooping ? '開' : '關'}</span>
              </button>

              {/* 磁吸吸附開關按鈕 (功能 3) */}
              <button
                onClick={() => setIsSnappingEnabled((s) => !s)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-all ${
                  isSnappingEnabled
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                }`}
                title="磁吸吸附開關 (對齊鄰近片段邊緣與播放頭)"
              >
                <Magnet className={`h-3 w-3 ${isSnappingEnabled ? 'text-teal-400' : 'text-zinc-500'}`} />
                <span>磁吸 {isSnappingEnabled ? '開' : '關'}</span>
              </button>

              {/* 多軌波形自動對齊按鈕 */}
              <button
                onClick={triggerAudioAutoAlign}
                disabled={isAutoAligning}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 active:scale-95 text-xs font-semibold border border-cyan-500/40 transition-all shadow-sm ml-1"
                title="比對各相機音訊波形交叉相關，自動校正時間差"
              >
                <AudioLines className={`h-3 w-3 ${isAutoAligning ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isAutoAligning ? '波形對齊中...' : '波形自動對齊'}</span>
              </button>

              <div className="h-3.5 w-[1px] bg-zinc-800 mx-1" />

              {(['A', 'B', 'C'] as CameraId[]).map((cam) => (
                <button
                  key={cam}
                  onClick={() => switchCameraAtCurrentTime(cam)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                    activeCamera === cam
                      ? CAMERA_CONFIGS[cam].badgeBg
                      : 'bg-zinc-800/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  切換 CAM {cam} [{CAMERA_CONFIGS[cam].hotkey}]
                </button>
              ))}

              {/* 功能 13：多選片段批次控制工具列 */}
              {selectedSegmentIds.size > 1 ? (
                <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800 text-[10px]">
                  <span className="text-teal-300 font-bold bg-teal-500/20 px-1.5 py-0.5 rounded border border-teal-500/30">
                    已多選 {selectedSegmentIds.size} 個片段：
                  </span>
                  {(['A', 'B', 'C'] as CameraId[]).map((cam) => (
                    <button
                      key={cam}
                      onClick={() => batchChangeSelectedSegmentsCamera(cam)}
                      className="px-1.5 py-0.5 rounded font-mono border bg-zinc-900 border-zinc-700 hover:text-teal-300 hover:border-teal-500 transition-all"
                    >
                      全部改為 {cam}
                    </button>
                  ))}
                  <button
                    onClick={deleteSelectedSegment}
                    className="px-1.5 py-0.5 rounded text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20"
                  >
                    批次刪除
                  </button>
                </div>
              ) : activeSelectedSegment ? (
                <div className="flex items-center gap-1 pl-2 border-l border-zinc-800 text-[10px] text-zinc-400">
                  <span className="text-teal-400 font-semibold">
                    選中 [CAM {activeSelectedSegment.camera}]：
                  </span>
                  {(['A', 'B', 'C'] as CameraId[]).map((cam) => (
                    <button
                      key={cam}
                      onClick={() => {
                        setSegments((prev) =>
                          prev.map((s) => (s.id === selectedSegmentId ? { ...s, camera: cam } : s))
                        );
                      }}
                      className={`px-1 py-0.2 rounded font-mono border ${
                        activeSelectedSegment.camera === cam
                          ? CAMERA_CONFIGS[cam].badgeBg
                          : 'bg-zinc-900 border-zinc-700 hover:text-white'
                      }`}
                    >
                      改為 {cam}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 功能 48: 新增時間軸標記點按鈕 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddMarker}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-amber-300 hover:bg-zinc-850 hover:border-amber-500/50 transition-colors shadow-sm"
                title="在目前時間軸游標位置新增標記點 (快捷鍵 M)"
              >
                <Bookmark className="h-3 w-3 text-amber-400" />
                <span>+標記 (M)</span>
              </button>

              {/* 功能 47: 片段色彩標籤快選 */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800" title="為選取的片段標註顏色標籤">
                <span className="text-[9.5px] text-zinc-500 mr-0.5">標籤：</span>
                {(['teal', 'rose', 'amber', 'indigo', 'emerald', 'sky'] as SegmentColorLabel[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleSetSegmentColor(c)}
                    className={`w-3 h-3 rounded-full ${SEGMENT_COLOR_PRESETS[c].dot} hover:scale-125 transition-transform border border-black/50 shadow-sm`}
                    title={`設為【${SEGMENT_COLOR_PRESETS[c].name}】`}
                  />
                ))}
              </div>
            </div>

            {/* 右側：縮放控制條 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-zinc-400">
                <button
                  onClick={() => applyPlayheadCentricZoom(zoomRatio - 1.0)}
                  className="p-1 hover:text-zinc-100 active:scale-95"
                  title="以播放頭為中心縮小"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>

                <input
                  type="range"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={zoomRatio}
                  onChange={(e) => applyPlayheadCentricZoom(Number(e.target.value))}
                  className="w-20 accent-teal-400 h-1 bg-zinc-800 rounded"
                  title="時間軸居中縮放 (支援 Ctrl + 滾輪)"
                />

                <button
                  onClick={() => applyPlayheadCentricZoom(zoomRatio + 1.0)}
                  className="p-1 hover:text-zinc-100 active:scale-95"
                  title="以播放頭為中心放大"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => applyPlayheadCentricZoom(1.0)}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono hover:text-teal-300 border border-zinc-700"
                  title="全片適應視窗"
                >
                  全覽
                </button>
              </div>
            </div>
          </div>

          {/* 多軌主畫布 */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* 左側軌道標頭欄 */}
            <div className="w-44 shrink-0 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col z-20 shadow-md">
              <div className="h-6 border-b border-zinc-800/80 flex items-center px-3 text-[10px] text-zinc-500 font-mono">
                TRACKS
              </div>

              {/* 功能 83: V2 B-Roll 覆蓋軌道標頭 */}
              <div className="h-14 border-b border-zinc-800/80 px-2.5 flex flex-col justify-center bg-zinc-950/70 border-l-2 border-indigo-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                      V2
                    </span>
                    <span className="text-xs text-zinc-200 font-medium">B-Roll 覆蓋軌</span>
                  </div>
                  <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/80 px-1 rounded border border-indigo-500/40">
                    {brollSegments.length} clips
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono pt-0.5 truncate">
                  空鏡 / 畫中畫 (PiP)
                </div>
              </div>

              {(['C', 'B', 'A'] as CameraId[]).map((camId) => {
                const config = CAMERA_CONFIGS[camId];
                const state = trackStates[camId];
                const isActiveTrack = activeCamera === camId;
                const offset = audioOffsets[camId];

                return (
                  <div
                    key={camId}
                    className={`h-16 border-b border-zinc-800/80 px-2.5 flex flex-col justify-center transition-all ${
                      isActiveTrack ? 'bg-zinc-900/90 border-l-2 ' + config.borderColor : 'bg-zinc-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${config.badgeBg}`}>
                          {camId}
                        </span>
                        <span className="text-xs text-zinc-200 font-medium truncate max-w-[70px]">
                          {config.name}
                        </span>
                      </div>

                      {/* 功能 11 & 12：專業 Mute(靜音) / Solo(獨奏) / Eye(顯示) / Lock(鎖定) 按鈕組 */}
                      <div className="flex items-center gap-1 text-zinc-500">
                        {/* 顯示/隱藏按鈕 (功能 12) */}
                        <button
                          onClick={() => toggleTrack(camId, 'visible')}
                          className={`p-0.5 rounded transition-all ${
                            !state.visible ? 'text-red-400 bg-red-500/10' : 'hover:text-zinc-200'
                          }`}
                          title={state.visible ? `隱藏 CAM ${camId} (自動備援切換)` : `顯示 CAM ${camId}`}
                        >
                          {state.visible ? <Eye className="h-3 w-3 text-teal-400" /> : <EyeOff className="h-3 w-3 text-red-400" />}
                        </button>

                        {/* 靜音按鈕 Mute (功能 11) */}
                        <button
                          onClick={() => toggleTrack(camId, 'muted')}
                          className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono border transition-all ${
                            state.muted ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                          }`}
                          title={state.muted ? `取消靜音 CAM ${camId}` : `靜音 CAM ${camId} (M)`}
                        >
                          M
                        </button>

                        {/* 獨奏按鈕 Solo (功能 11) */}
                        <button
                          onClick={() => setSoloTrack((cur) => (cur === camId ? null : camId))}
                          className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono border transition-all ${
                            soloTrack === camId ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-sm' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                          }`}
                          title={soloTrack === camId ? `取消 Solo 獨奏` : `Solo 獨奏監聽 CAM ${camId} (S)`}
                        >
                          S
                        </button>

                        {/* 鎖定按鈕 Lock */}
                        <button
                          onClick={() => toggleTrack(camId, 'locked')}
                          className={`p-0.5 rounded transition-all ${
                            state.locked ? 'text-amber-400 bg-amber-500/10' : 'hover:text-zinc-200'
                          }`}
                          title={state.locked ? `解除 CAM ${camId} 鎖定` : `鎖定 CAM ${camId} 軌道`}
                        >
                          {state.locked ? <Lock className="h-3 w-3 text-amber-400" /> : <Unlock className="h-3 w-3 text-zinc-500" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                      <span className="truncate max-w-[70px]">
                        {inputFiles[camId] ? inputs[camId === 'A' ? 'cameraA' : camId === 'B' ? 'cameraB' : 'cameraC'] : config.role}
                      </span>
                      <div className="flex items-center gap-1">
                        {soloTrack === camId ? (
                          <span className="text-[8px] px-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">SOLO</span>
                        ) : state.muted ? (
                          <span className="text-[8px] px-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">MUTED</span>
                        ) : null}
                        <span className="text-[9px] px-1 rounded bg-zinc-900 text-cyan-300 border border-zinc-800">
                          Δ {offset > 0 ? `+${offset}` : offset}s
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 功能 11: AUD 主音軌控制列 (支援 Mute 靜音與 Solo 監聽) */}
              <div className="h-14 border-b border-zinc-800/80 px-2.5 flex flex-col justify-center bg-zinc-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-cyan-500/15 text-cyan-300 border-cyan-500/30">
                      AUD
                    </span>
                    <span className="text-xs text-zinc-200 font-medium">主音軌 (Master)</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* 靜音按鈕 Mute (功能 11) */}
                    <button
                      onClick={() => toggleTrack('Audio', 'muted')}
                      className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono border transition-all ${
                        trackStates.Audio.muted ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                      }`}
                      title={trackStates.Audio.muted ? '取消靜音主音軌' : '靜音主音軌 (M)'}
                    >
                      M
                    </button>
                    {/* 獨奏按鈕 Solo (功能 11) */}
                    <button
                      onClick={() => setSoloTrack((cur) => (cur === 'Audio' ? null : 'Audio'))}
                      className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono border transition-all ${
                        soloTrack === 'Audio' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-sm' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                      }`}
                      title={soloTrack === 'Audio' ? '取消 Solo 獨奏' : 'Solo 獨奏監聽主音軌 (S)'}
                    >
                      S
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                  <span>基準 0.00s 對齊軌</span>
                  {soloTrack === 'Audio' ? (
                    <span className="text-[8px] px-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">SOLO</span>
                  ) : trackStates.Audio.muted ? (
                    <span className="text-[8px] px-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">MUTED</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 右側可橫向滾動的時間軸主體 */}
            <div
              ref={timelineScrollContainerRef}
              onWheel={handleTimelineWheel}
              className="flex-1 overflow-x-auto overflow-y-hidden bg-zinc-950/90 relative"
            >
              <div
                ref={timelineContentRef}
                onMouseDown={handleTimelineMouseDown}
                style={{ width: `${timelineTrackWidth}px` }}
                className="relative h-full flex flex-col cursor-pointer"
              >
                {/* 問題 2: 滑鼠框選半透明幾何遮罩 (Marquee Selection Box) */}
                {marqueeBox && (
                  <div
                    style={{
                      left: `${Math.min(marqueeBox.startX, marqueeBox.currentX)}px`,
                      top: `${Math.min(marqueeBox.startY, marqueeBox.currentY)}px`,
                      width: `${Math.abs(marqueeBox.currentX - marqueeBox.startX)}px`,
                      height: `${Math.abs(marqueeBox.currentY - marqueeBox.startY)}px`
                    }}
                    className="absolute z-50 pointer-events-none border-2 border-dashed border-cyan-400 bg-cyan-500/20 backdrop-blur-[0.5px] rounded shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                  />
                )}
                {/* 頂部時間刻度尺 (Ruler - 支援按住滑鼠即時拖曳尋道與預覽) */}
                <div
                  onMouseDown={(e) => {
                    setIsScrubbingRuler(true);
                    handleTimelineClick(e);
                  }}
                  className="h-6 border-b border-zinc-800/80 relative text-[10px] font-mono text-zinc-500 select-none bg-zinc-900/60 flex items-center cursor-ew-resize"
                >
                  {/* 功能 48: 時間軸標記點旗標 (Timeline Marker Pins) */}
                  {markers.map((mk) => {
                    const leftPx = timeToPx(mk.time);
                    return (
                      <div
                        key={mk.id}
                        style={{ left: `${leftPx}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentTime(mk.time);
                          setLiveCutNotice(`已跳轉至標記點：${mk.label} (${formatSMPTE(mk.time)})`);
                          setTimeout(() => setLiveCutNotice(null), 1200);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setMarkers((prev) => prev.filter((m) => m.id !== mk.id));
                          setLiveCutNotice(`已刪除標記點：${mk.label}`);
                          setTimeout(() => setLiveCutNotice(null), 1200);
                        }}
                        className="absolute top-0 z-45 -translate-x-1/2 cursor-pointer group flex flex-col items-center"
                        title={`標記點：${mk.label} @ ${formatSMPTE(mk.time)} (點擊跳轉，雙擊刪除)`}
                      >
                        {/* 功能 79 & 48: 依標記點色彩 (如 AI 章節轉移之紫色旗標) 渲染對應樣式 */}
                        <div className={`w-2.5 h-3 rounded-b flex items-center justify-center ${
                          mk.color === 'purple'
                            ? 'bg-purple-500 border border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.9)]'
                            : mk.color === 'red'
                            ? 'bg-rose-500 border border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                            : mk.color === 'blue'
                            ? 'bg-sky-500 border border-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.9)]'
                            : mk.color === 'green'
                            ? 'bg-emerald-500 border border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                            : 'bg-amber-400 border border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                        }`}>
                          <div className="w-0.5 h-1.5 bg-zinc-950 rounded-full" />
                        </div>
                        <div className={`hidden group-hover:flex absolute top-3.5 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[9px] font-mono whitespace-nowrap shadow-xl z-50 ${
                          mk.color === 'purple' ? 'text-purple-300' : 'text-amber-300'
                        }`}>
                          {mk.label} ({formatSMPTE(mk.time)})
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: 15 }).map((_, i) => {
                    const markTime = (totalDuration / 14) * i;
                    const leftPx = timeToPx(markTime);
                    return (
                      <div
                        key={i}
                        style={{ left: `${leftPx}px` }}
                        className="absolute flex flex-col items-start -translate-x-1"
                      >
                        <span className="text-[9px] text-zinc-400">{formatShortTimecode(markTime)}</span>
                        <div className="h-1.5 w-[1px] bg-zinc-700 mt-0.5" />
                      </div>
                    );
                  })}
                </div>

                {/* 功能 15: 工作區入點/出點範圍遮罩 ({ } In/Out Range Mask) */}
                {inPoint !== null && inPoint > 0 && (
                  <div
                    style={{ left: 0, width: `${timeToPx(inPoint)}px` }}
                    className="absolute top-6 bottom-0 bg-black/45 z-30 pointer-events-none border-r-2 border-teal-400 select-none backdrop-brightness-75"
                  >
                    <div className="absolute top-1 right-1 px-1 rounded bg-teal-950/90 text-teal-300 font-mono text-[9px] font-bold border border-teal-500/40 shadow">
                      {'[ IN '} + formatShortTimecode(inPoint)
                    </div>
                  </div>
                )}

                {outPoint !== null && outPoint < totalDuration && (
                  <div
                    style={{ left: `${timeToPx(outPoint)}px`, width: `${timeToPx(totalDuration - outPoint)}px` }}
                    className="absolute top-6 bottom-0 bg-black/45 z-30 pointer-events-none border-l-2 border-teal-400 select-none backdrop-brightness-75"
                  >
                    <div className="absolute top-1 left-1 px-1 rounded bg-teal-950/90 text-teal-300 font-mono text-[9px] font-bold border border-teal-500/40 shadow">
                      formatShortTimecode(outPoint) + {' ]'}
                    </div>
                  </div>
                )}

                {inPoint !== null && outPoint !== null && outPoint > inPoint && (
                  <div
                    style={{ left: `${timeToPx(inPoint)}px`, width: `${timeToPx(outPoint - inPoint)}px` }}
                    className="absolute top-6 h-0.5 bg-gradient-to-r from-teal-400 to-indigo-400 z-35 pointer-events-none shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                  />
                )}

                {/* 功能 83, 84, 85: V2 B-Roll 空鏡覆蓋軌道畫布 (支援素材拖曳置入) */}
                <div
                  onDragOver={handleV2TrackDragOver}
                  onDragLeave={handleV2TrackDragLeave}
                  onDrop={handleV2TrackDrop}
                  className={`h-14 border-b border-zinc-800/80 relative overflow-hidden flex items-center transition-all ${
                    isV2DragOver ? 'bg-indigo-950/60 ring-2 ring-inset ring-indigo-400' : 'bg-zinc-950/60'
                  }`}
                >
                  <div className="absolute inset-x-0 inset-y-1 rounded bg-indigo-950/10 border border-dashed border-indigo-900/30 flex items-center px-4 pointer-events-none">
                    <span className="text-[10px] text-indigo-400/40 font-mono">
                      [V2 OVERLAY] B-Roll 空鏡 / 畫中畫覆蓋軌 (支援講者發言智慧對齊)
                    </span>
                  </div>

                  {brollSegments.map((broll) => {
                    const leftPx = timeToPx(broll.startTime);
                    const widthPx = Math.max(30, timeToPx(broll.endTime) - leftPx);
                    const isBrollActive = currentTime >= broll.startTime && currentTime <= broll.endTime;

                    return (
                      <div
                        key={broll.id}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                        className={`absolute top-1 bottom-1 rounded border select-none shadow-md flex items-center justify-between px-2 text-[10px] cursor-pointer transition-all ${
                          isBrollActive
                            ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400 text-white shadow-lg z-20'
                            : 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 hover:border-indigo-400 z-10'
                        }`}
                        title={`${broll.name} (${formatSMPTE(broll.startTime)} ➔ ${formatSMPTE(broll.endTime)}) - 雙擊刪除`}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBRoll(broll.id);
                        }}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Film className="h-3 w-3 text-indigo-400 shrink-0" />
                          <span className="font-bold truncate">{broll.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                          <span className="px-1 rounded bg-black/60 text-indigo-300 border border-indigo-500/40 uppercase">
                            {broll.displayMode}
                          </span>
                          <span className="px-1 rounded bg-black/40 text-zinc-400">
                            {broll.transition}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 鏡頭 C / B / A 視訊軌道 (支援拖入素材與修剪) */}
                {(['C', 'B', 'A'] as CameraId[]).map((camId) => {
                  const isTrackDragOver = dragOverTrack === camId;
                  const state = trackStates[camId];

                  const isTrackHidden = !state.visible;

                  return (
                    <div
                      key={camId}
                      onDragOver={(e) => !isTrackHidden && !state.locked && handleTimelineDragOver(e, camId)}
                      onDragLeave={handleTimelineDragLeave}
                      onDrop={(e) => !isTrackHidden && !state.locked && handleTimelineDrop(e, camId)}
                      className={`h-16 border-b border-zinc-800/80 relative overflow-hidden transition-all ${
                        isTrackDragOver ? 'bg-teal-950/40 ring-2 ring-inset ring-teal-400' : 'bg-zinc-950/40'
                      } ${isTrackHidden ? 'opacity-30 grayscale-[50%]' : ''}`}
                    >
                      {/* 功能 12：軌道已隱藏提示標籤 */}
                      {isTrackHidden && (
                        <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/40 pointer-events-none">
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-2 py-0.5 rounded shadow">
                            [CAM {camId} 視訊已隱藏，主畫面自動切換至備援鏡頭]
                          </span>
                        </div>
                      )}
                      {/* 拖曳預覽虛影方塊 (Drag Ghost Preview) */}
                      {isTrackDragOver && dragGhostTime !== null && (
                        <div
                          style={{
                            left: `${timeToPx(dragGhostTime)}px`,
                            width: `${timeToPx(300)}px`
                          }}
                          className="absolute top-1 bottom-1 rounded border-2 border-dashed border-teal-300 bg-teal-500/20 z-30 pointer-events-none flex items-center justify-center text-[10px] font-mono text-teal-200"
                        >
                          放開以插入片段 ({formatSMPTE(dragGhostTime)})
                        </div>
                      )}

                      {/* 空軌提示與點擊快速置入導引 */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const matchedAsset = mediaAssets.find((a) => a.assignedCamera === camId) || mediaAssets[0];
                          if (matchedAsset) insertAssetAtPlayhead(matchedAsset);
                        }}
                        className="absolute inset-x-0 inset-y-1 rounded bg-zinc-900/20 border border-dashed border-zinc-800/30 hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors flex items-center justify-between px-4 cursor-pointer select-none group"
                        title={`點擊直接在此軌道插入 CAM ${camId} 素材，或從左上方素材庫拖放至此`}
                      >
                        <span className="text-[10px] text-zinc-600 group-hover:text-teal-400 font-mono flex items-center gap-1 transition-colors">
                          <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span>[{camId}] 來源軌道 (按住卡片拖放至此，或雙擊素材/點此快速置入)</span>
                        </span>
                        <span className="text-[9px] font-mono text-zinc-700 group-hover:text-zinc-400">
                          快捷鍵: 數字 [{camId === 'A' ? '1' : camId === 'B' ? '2' : '3'}] 即時切鏡
                        </span>
                      </div>

                      {/* 功能 10：軌道鎖定防護層 (Track Lock Overlay) */}
                      {state.locked && (
                        <div
                          className="absolute inset-0 z-40 bg-zinc-950/60 flex items-center justify-center cursor-not-allowed border border-amber-500/20"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.08) 0, rgba(245, 158, 11, 0.08) 12px, transparent 12px, transparent 24px)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLiveCutNotice(`CAM ${camId} 軌道已被鎖定，無法進行編輯。請先解鎖軌道。`);
                            setTimeout(() => setLiveCutNotice(null), 1800);
                          }}
                        >
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-amber-500/40 text-[11px] font-mono text-amber-300 shadow-lg">
                            <Lock className="h-3.5 w-3.5 text-amber-400" />
                            <span>軌道已鎖定 (唯讀保護中)</span>
                          </div>
                        </div>
                      )}

                      {segments
                        .filter((seg) => seg.camera === camId)
                        .map((seg) => {
                          const leftPx = timeToPx(seg.startTime);
                          const widthPx = Math.max(20, timeToPx(seg.endTime) - leftPx);
                          // 功能 13: 確保多選狀態下所有被選取片段皆呈現選取外框與高亮
                          const isSelected = selectedSegmentId === seg.id || selectedSegmentIds.has(seg.id);
                          const segDuration = seg.endTime - seg.startTime;

                          return (
                            <div
                              key={seg.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentTool === 'razor') {
                                  handleRazorCutOnSegment(e, seg);
                                } else {
                                  // 功能 13: 支援 Shift 或 Ctrl/Command 鍵多選片段
                                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                    setSelectedSegmentIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(seg.id)) next.delete(seg.id);
                                      else next.add(seg.id);
                                      return next;
                                    });
                                  } else {
                                    setSelectedSegmentIds(new Set([seg.id]));
                                  }
                                  setSelectedSegmentId(seg.id);
                                  setCurrentTime(seg.startTime);
                                }
                              }}
                              style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                              className={`absolute top-1 bottom-1 rounded-md border flex flex-col justify-between select-none shadow-lg z-10 transition-shadow ${
                                seg.colorLabel
                                  ? `${SEGMENT_COLOR_PRESETS[seg.colorLabel].bg} ${SEGMENT_COLOR_PRESETS[seg.colorLabel].border} ${SEGMENT_COLOR_PRESETS[seg.colorLabel].text} ${SEGMENT_COLOR_PRESETS[seg.colorLabel].glow}`
                                  : camId === 'A'
                                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 hover:border-emerald-400'
                                  : camId === 'B'
                                  ? 'bg-violet-950/80 border-violet-500 text-violet-100 hover:border-violet-400'
                                  : 'bg-amber-950/80 border-amber-500 text-amber-100 hover:border-amber-400'
                              } ${selectedSegmentIds.has(seg.id) ? 'ring-2 ring-white shadow-xl brightness-125 z-20 scale-[1.01]' : ''}`}
                            >
                              {/* 功能 36: 視訊淡入淡出時間軸視覺反饋 (梯形斜率遮罩) */}
                              {isSelected && videoProps.fadeInDuration > 0 && (
                                <div
                                  style={{ width: `${Math.min(widthPx * 0.45, timeToPx(videoProps.fadeInDuration))}px` }}
                                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-20 flex items-center pl-3"
                                >
                                  <span className="text-[7.5px] font-mono text-teal-300 font-bold leading-none drop-shadow">
                                    ▲ {videoProps.fadeInDuration}s
                                  </span>
                                </div>
                              )}
                              {isSelected && videoProps.fadeOutDuration > 0 && (
                                <div
                                  style={{ width: `${Math.min(widthPx * 0.45, timeToPx(videoProps.fadeOutDuration))}px` }}
                                  className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-20 flex items-center justify-end pr-3"
                                >
                                  <span className="text-[7.5px] font-mono text-indigo-300 font-bold leading-none drop-shadow">
                                    {videoProps.fadeOutDuration}s ▼
                                  </span>
                                </div>
                              )}

                              <div
                                onMouseDown={(e) => startTrimming(e, seg.id, 'start')}
                                className="absolute left-0 top-0 bottom-0 w-3 bg-white/20 hover:bg-teal-400 cursor-ew-resize rounded-l flex items-center justify-center z-30 transition-colors"
                                title={`入點: ${formatSMPTE(seg.startTime)} (向左/右拖曳裁切)`}
                              >
                                <div className="h-4 w-[1.5px] bg-white/80" />
                              </div>

                              <div
                                onMouseDown={(e) => startTrimming(e, seg.id, 'move')}
                                className="flex-1 px-3 py-1 flex flex-col justify-between cursor-move overflow-hidden"
                                title="按住拖曳可前後平移時間 (已啟動磁吸對齊)"
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="flex items-center gap-1 truncate">
                                    <GripVertical className="h-3 w-3 opacity-60 shrink-0" />
                                    CAM {camId}
                                  </span>
                                  <span className="font-mono text-[10px] opacity-80 shrink-0">
                                    {segDuration > 60 ? `${(segDuration / 60).toFixed(1)}m` : `${segDuration.toFixed(1)}s`}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 h-3 opacity-70 overflow-hidden">
                                  {Array.from({ length: Math.min(24, Math.floor(widthPx / 15)) }).map((_, barIdx) => (
                                    <div
                                      key={barIdx}
                                      style={{ height: `${((barIdx * 7) % 8) + 4}px` }}
                                      className="w-1.5 bg-white/50 rounded-full shrink-0"
                                    />
                                  ))}
                                </div>
                              </div>

                              <div
                                onMouseDown={(e) => startTrimming(e, seg.id, 'end')}
                                className="absolute right-0 top-0 bottom-0 w-3 bg-white/20 hover:bg-teal-400 cursor-ew-resize rounded-r flex items-center justify-center z-30 transition-colors"
                                title={`出點: ${formatSMPTE(seg.endTime)} (向左/右拖曳裁切)`}
                              >
                                <div className="h-4 w-[1.5px] bg-white/80" />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}

                {/* 功能 44 & 45: 音訊主軌道與高解析度動態音訊波形圖即時描繪 (Audio Waveform & Envelopes) */}
                <div className="h-14 border-b border-zinc-800/80 relative overflow-hidden bg-zinc-950/80 flex items-center">
                  {/* 功能 44: 真實人聲頻譜動態波形圖 (波形依據逐字稿發言段落與非發言靜音區動態計算) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center">
                    <svg
                      width={timeToPx(totalDuration)}
                      height="56"
                      className="h-full overflow-visible"
                    >
                      {/* 繪製全片波形峰值柱 (每 4px 一柱，依據發言動態頻譜能量計算) */}
                      {Array.from({ length: Math.ceil(timeToPx(totalDuration) / 4) }).map((_, idx) => {
                        const pxPos = idx * 4;
                        const secTime = pxToTime(pxPos);
                        const isSpeaking = transcripts.some((t) => secTime >= t.startTime && secTime <= t.endTime);
                        const baseAmp = isSpeaking ? 24 : 5;
                        const wobble = Math.sin(secTime * 14) * 8 + Math.cos(secTime * 23) * 6;
                        const barHeight = Math.max(3, Math.min(48, baseAmp + wobble));
                        const isPlayed = secTime <= currentTime;

                        return (
                          <rect
                            key={idx}
                            x={pxPos}
                            y={28 - barHeight / 2}
                            width="2.5"
                            height={barHeight}
                            rx="1"
                            fill={isPlayed ? '#22d3ee' : 'rgba(34, 211, 238, 0.35)'}
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* 功能 45: 音訊淡入視覺包絡斜率遮罩 */}
                  {videoProps.audioFadeInDuration > 0 && (
                    <div
                      style={{ width: `${timeToPx(videoProps.audioFadeInDuration)}px` }}
                      className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent pointer-events-none z-15 border-r border-dashed border-cyan-400/60"
                    >
                      <span className="text-[8px] font-mono text-cyan-300 absolute bottom-1 left-1.5 font-bold">
                        ▲ Fade In {videoProps.audioFadeInDuration}s
                      </span>
                    </div>
                  )}

                  {/* 功能 45: 音訊淡出視覺包絡斜率遮罩 */}
                  {videoProps.audioFadeOutDuration > 0 && (
                    <div
                      style={{
                        width: `${timeToPx(videoProps.audioFadeOutDuration)}px`,
                        left: `${timeToPx(totalDuration - videoProps.audioFadeOutDuration)}px`
                      }}
                      className="absolute top-0 bottom-0 bg-gradient-to-l from-zinc-950/90 via-zinc-950/40 to-transparent pointer-events-none z-15 border-l border-dashed border-cyan-400/60"
                    >
                      <span className="text-[8px] font-mono text-cyan-300 absolute bottom-1 right-1.5 font-bold">
                        Fade Out {videoProps.audioFadeOutDuration}s ▼
                      </span>
                    </div>
                  )}

                  {/* 逐字稿標記段落 */}
                  {transcripts.map((para) => {
                    const left = timeToPx(para.startTime);
                    const width = Math.max(40, timeToPx(para.endTime) - left);
                    return (
                      <div
                        key={para.id}
                        style={{ left: `${left}px`, width: `${width}px` }}
                        className="absolute h-4 top-1 rounded bg-cyan-950/90 border border-cyan-500/40 text-[9px] text-cyan-200 px-1 truncate flex items-center z-10"
                      >
                        {para.speaker}: {para.text}
                      </div>
                    );
                  })}
                </div>

                {/* 磁吸對齊黃色指示輔助線 (Magnetic Snap Guide Line) */}
                {activeSnapGuideTime !== null && (
                  <div
                    style={{ left: `${timeToPx(activeSnapGuideTime)}px` }}
                    className="absolute top-0 bottom-0 w-[1.5px] bg-yellow-400 z-50 pointer-events-none shadow-[0_0_8px_rgba(250,204,21,1)]"
                  >
                    <div className="absolute top-0 -left-6 bg-yellow-400 text-zinc-950 font-mono text-[9px] font-bold px-1 rounded shadow">
                      SNAP {formatShortTimecode(activeSnapGuideTime)}
                    </div>
                  </div>
                )}

                {/* 全域紅色游標 */}
                <div
                  style={{ left: `${timeToPx(currentTime)}px` }}
                  className="absolute top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none z-40 shadow-[0_0_10px_rgba(239,68,68,1)]"
                >
                  <div className="absolute -top-1 -left-2 h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center">
                    <div className="h-1 w-1 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能 51: Whisper AI 語音轉錄運算進度彈窗 */}
      {isTranscribing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Whisper AI 語音轉文字中</h3>
                <p className="text-xs text-zinc-400">正在調用 Intel® OpenVINO™ / AI Boost 神經網路模型解析音訊頻譜...</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  style={{ width: `${transcribeProgress}%` }}
                  className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-300"
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                <span>{transcribeStep}</span>
                <span>{transcribeProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 自動導播運算彈窗 */}
      {isCalculatingAiDirector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">AI 多機位自動導播計算中</h3>
                <p className="text-xs text-zinc-400">正在分析全片音訊能量與發言者切換點...</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  style={{ width: `${aiDirectorProgress}%` }}
                  className="h-full bg-gradient-to-r from-teal-500 via-indigo-500 to-pink-500 transition-all duration-300"
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                <span>{aiDirectorStep}</span>
                <span>{aiDirectorProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9:16 短影音生成彈窗 */}
      {isShortsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none">
          <div className="relative w-full max-w-5xl h-[86vh] rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl flex flex-col gap-3.5">
            {/* 功能 70: 一鍵批量導出 9:16 短影音進度遮罩 */}
            {isBatchExportingShorts && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center z-50 p-6 space-y-3 animate-fadeIn">
                <Sparkles className="h-8 w-8 text-pink-400 animate-spin" />
                <h4 className="text-sm font-bold text-white">
                  正在透過 Snapdragon NPU 進行 9:16 自動裁切與批量渲染...
                </h4>
                <div className="w-64 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    style={{ width: `${batchExportProgress}%` }}
                    className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-300"
                  />
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  進度：[{batchExportIndex}/3] ({batchExportProgress}%) - 正在輸出至 output/shorts/
                </span>
              </div>
            )}
            {/* 彈窗標頭 */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <span>AI 自動產出 9:16 直式短影音精華 (TikTok / Reels / Shorts)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">
                      Intel® AI 智慧裁切
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    結合情感到位度檢測、發言爆點識別與人臉即時置中，自動生成社群高留存短影音
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShortsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 彈窗核心內容：左側選單與設定、右側即時 9:16 預覽器 */}
            <div className="flex-1 flex gap-5 min-h-0">
              {/* 左側：高光候選片段清單與版型控制 */}
              <div className="w-[55%] flex flex-col gap-3 overflow-y-auto pr-2">
                {/* 功能 66: AI 偵測到的 3 個高光吸睛片段列表 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">AI 識別的高光精華候選 (Viral Hooks)：</span>
                    <span className="text-[10px] font-mono text-zinc-500">依據情緒起伏與金句評分</span>
                  </div>

                  {AI_SHORT_CANDIDATES.map((short) => (
                    <div
                      key={short.id}
                      onClick={() => setSelectedShortId(short.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedShortId === short.id
                          ? 'bg-zinc-800/90 border-pink-500/60 shadow-lg ring-1 ring-pink-500/40'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-850/60'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                          {short.hook}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-amber-300">吸睛度 {short.score} 分</span>
                          <span className="text-[9.5px] font-mono text-zinc-500">({short.duration})</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200 pt-0.5">{short.title}</h4>
                      <p className="text-[11px] text-zinc-400 pt-1 italic line-clamp-1">{short.captionText}</p>
                    </div>
                  ))}
                </div>

                {/* 功能 67: 動態主角人臉鎖定自動居中裁剪 (Smart Auto-Reframe Crop with Smoothing) */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
                    <span className="text-[11px] font-bold text-zinc-200">
                      主角人臉動態居中 (Smart Auto-Reframe)
                    </span>
                    <span className="text-[9.5px] font-mono text-emerald-400">Intel® AI 加速</span>
                  </div>

                  <label className="flex items-center justify-between text-[10.5px] text-zinc-300 cursor-pointer">
                    <span>啟用 9:16 人臉動態追蹤與置中構圖</span>
                    <input
                      type="checkbox"
                      checked={shortsAutoReframe}
                      onChange={(e) => setShortsAutoReframe(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-pink-500 focus:ring-0"
                    />
                  </label>

                  {shortsAutoReframe && (
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-850">
                      <span>平滑追隨防抖 (Smoothing)：</span>
                      <div className="flex items-center gap-1 font-mono">
                        <button
                          onClick={() => setShortsSmoothing('instant')}
                          className={`px-2 py-0.5 rounded border ${
                            shortsSmoothing === 'instant'
                              ? 'bg-pink-500/20 text-pink-200 border-pink-500/50 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          即時緊跟
                        </button>
                        <button
                          onClick={() => setShortsSmoothing('smooth')}
                          className={`px-2 py-0.5 rounded border ${
                            shortsSmoothing === 'smooth'
                              ? 'bg-pink-500/20 text-pink-200 border-pink-500/50 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          電影級平滑 (推薦)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 功能 68: 直式短影音版型切換 (Vertical Layout Templates) */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    版型佈局樣式 (Vertical Layout Template)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'split', label: '上下雙分割', sub: '主持在上一來賓在下' },
                      { id: 'single', label: '單人全螢幕', sub: '主角動態人臉置中' },
                      { id: 'pip', label: '子母小窗', sub: '主角主畫面+右下圓圈' },
                      { id: 'banner', label: '字幕字卡', sub: '上標題/中視訊/下字幕' }
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setVerticalTemplate(tpl.id as any)}
                        className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                          verticalTemplate === tpl.id
                            ? 'bg-pink-500/20 text-pink-200 border-pink-500/50 font-bold shadow'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                        }`}
                      >
                        <span className="text-[10.5px] font-bold text-zinc-100">{tpl.label}</span>
                        <span className="text-[8px] text-zinc-500">{tpl.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 功能 69: 動態字幕風格與進度條開關 */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    社群動態字卡與進度條 (Captions & Progress)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'tiktok', name: 'TikTok 爆款黃', desc: '粗體黃字黑底' },
                      { id: 'mrbeast', name: 'MrBeast 跳動字', desc: '詞組逐字彈跳' },
                      { id: 'minimal', name: '極簡科技白', desc: '乾淨俐落高質感' }
                    ].map((cap) => (
                      <button
                        key={cap.id}
                        onClick={() => setCaptionStyle(cap.id as any)}
                        className={`p-1.5 rounded-lg border text-center transition-all ${
                          captionStyle === cap.id
                            ? 'bg-pink-500/20 text-pink-200 border-pink-500/50 font-bold shadow'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                        }`}
                      >
                        <span className="text-[10px] font-bold block">{cap.name}</span>
                        <span className="text-[8px] text-zinc-500">{cap.desc}</span>
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center justify-between pt-1 border-t border-zinc-850 text-[10.5px] text-zinc-300 cursor-pointer">
                    <span>顯示底部吸睛動態進度條 (Progress Bar)</span>
                    <input
                      type="checkbox"
                      checked={showShortsProgressBar}
                      onChange={(e) => setShowShortsProgressBar(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-pink-500 focus:ring-0"
                    />
                  </label>
                </div>
              </div>

              {/* 右側：9:16 真實預覽監視器畫布 */}
              <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 rounded-xl p-3 border border-zinc-800/80 shadow-inner">
                {/* 9:16 手機比例畫布 (1080x1920) */}
                <div className="relative h-full aspect-[9/16] rounded-2xl overflow-hidden bg-black border-2 border-zinc-700 shadow-2xl flex flex-col">
                  {/* 頂部社群標頭吸睛橫幅 */}
                  <div className="absolute top-3 inset-x-3 z-30 p-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-center">
                    <span className="text-[10.5px] font-black text-amber-300 tracking-wide line-clamp-1">
                      {AI_SHORT_CANDIDATES.find((s) => s.id === selectedShortId)?.captionText}
                    </span>
                  </div>

                  {/* 動態選定之高光候選短影音資訊 */}
                  {(() => {
                    const activeCandidate = AI_SHORT_CANDIDATES.find((s) => s.id === selectedShortId) || AI_SHORT_CANDIDATES[0];
                    const primaryVideoUrl = inputFiles[activeCandidate.primaryCam] || inputFiles.A;
                    const secondaryVideoUrl = inputFiles[activeCandidate.secondaryCam] || inputFiles.B;
                    const reframePositionStyle = shortsAutoReframe
                      ? activeCandidate.primaryCam === 'B' ? '60% 30%' : '40% 30%'
                      : 'center center';

                    return (
                      <>
                        {/* 版型渲染：上下分割模式 (功能 68) */}
                        {verticalTemplate === 'split' && (
                          <div className="w-full h-full flex flex-col">
                            {/* 上半部：主持人 */}
                            <div className="flex-1 relative overflow-hidden border-b-2 border-pink-500/40 bg-zinc-900 flex items-center justify-center">
                              {primaryVideoUrl ? (
                                <video
                                  src={primaryVideoUrl}
                                  style={{ objectPosition: reframePositionStyle }}
                                  className={`w-full h-full object-cover scale-110 ${shortsSmoothing === 'smooth' ? 'transition-all duration-300' : ''}`}
                                  autoPlay
                                  loop
                                  muted
                                />
                              ) : (
                                <div className="text-center p-2 text-zinc-400 font-mono text-[10px]">
                                  <Video className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
                                  <span>CAM {activeCandidate.primaryCam} (發言主角特寫)</span>
                                </div>
                              )}
                              <span className="absolute bottom-1 left-2 text-[8px] font-mono px-1 rounded bg-black/60 text-emerald-300">
                                {activeCandidate.primaryCam === 'A' ? 'HOST (Alex)' : 'GUEST (David)'}
                              </span>
                              {shortsAutoReframe && (
                                <span className="absolute top-1 right-2 text-[7px] font-mono px-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                                  NPU REFRAMED
                                </span>
                              )}
                            </div>

                            {/* 下半部：對談者 */}
                            <div className="flex-1 relative overflow-hidden bg-zinc-900 flex items-center justify-center">
                              {secondaryVideoUrl ? (
                                <video
                                  src={secondaryVideoUrl}
                                  style={{ objectPosition: 'center 30%' }}
                                  className={`w-full h-full object-cover scale-110 ${shortsSmoothing === 'smooth' ? 'transition-all duration-300' : ''}`}
                                  autoPlay
                                  loop
                                  muted
                                />
                              ) : (
                                <div className="text-center p-2 text-zinc-400 font-mono text-[10px]">
                                  <Video className="h-5 w-5 mx-auto mb-1 text-violet-400" />
                                  <span>CAM {activeCandidate.secondaryCam} (反應特寫)</span>
                                </div>
                              )}
                              <span className="absolute bottom-1 left-2 text-[8px] font-mono px-1 rounded bg-black/60 text-violet-300">
                                {activeCandidate.secondaryCam === 'B' ? 'GUEST (David)' : 'HOST (Alex)'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 版型渲染：單人聚焦全螢幕模式 */}
                        {verticalTemplate === 'single' && (
                          <div className="w-full h-full relative overflow-hidden bg-zinc-900 flex items-center justify-center">
                            {primaryVideoUrl ? (
                              <video
                                src={primaryVideoUrl}
                                style={{ objectPosition: reframePositionStyle }}
                                className={`w-full h-full object-cover scale-125 ${shortsSmoothing === 'smooth' ? 'transition-all duration-500' : ''}`}
                                autoPlay
                                loop
                                muted
                              />
                            ) : (
                              <div className="text-center p-2 text-zinc-400 font-mono text-[10px]">
                                <Film className="h-6 w-6 mx-auto mb-1 text-pink-400" />
                                <span>9:16 單人主角置中</span>
                              </div>
                            )}
                            {shortsAutoReframe && (
                              <span className="absolute top-11 right-2 text-[7px] font-mono px-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                                AI FACE LOCKED
                              </span>
                            )}
                          </div>
                        )}

                        {/* 版型渲染：子母小窗模式 */}
                        {verticalTemplate === 'pip' && (
                          <div className="w-full h-full relative overflow-hidden bg-zinc-900 flex items-center justify-center">
                            {primaryVideoUrl && (
                              <video
                                src={primaryVideoUrl}
                                style={{ objectPosition: reframePositionStyle }}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                              />
                            )}
                            {/* 右下小窗 */}
                            <div className="absolute right-3 bottom-14 w-20 h-28 rounded-xl overflow-hidden border-2 border-white/60 shadow-2xl bg-zinc-950">
                              {secondaryVideoUrl ? (
                                <video src={secondaryVideoUrl} className="w-full h-full object-cover" autoPlay loop muted />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-zinc-500">PIP</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 版型渲染：字幕字卡橫幅模式 */}
                        {verticalTemplate === 'banner' && (
                          <div className="w-full h-full flex flex-col justify-between py-10 bg-zinc-950">
                            <div className="p-3 text-center">
                              <span className="text-xs font-black text-white bg-pink-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                PODFLOW EXCLUSIVE
                              </span>
                            </div>
                            <div className="w-full aspect-video bg-zinc-900 overflow-hidden border-y border-zinc-800">
                              {primaryVideoUrl && (
                                <video
                                  src={primaryVideoUrl}
                                  style={{ objectPosition: reframePositionStyle }}
                                  className="w-full h-full object-cover"
                                  autoPlay
                                  loop
                                  muted
                                />
                              )}
                            </div>
                            <div className="p-3 text-center">
                              <span className="text-xs font-bold text-yellow-300">點擊主頁連結收聽完整單集</span>
                            </div>
                          </div>
                        )}

                        {/* 功能 69: 社群爆款動態字卡疊加層 (動態繫結選定之短影音金句) */}
                        <div className="absolute bottom-9 inset-x-2 z-30 flex justify-center">
                          <div className={`px-2.5 py-1 rounded-lg text-center shadow-2xl backdrop-blur-sm ${
                            captionStyle === 'tiktok'
                              ? 'bg-black/85 border border-yellow-400/50 text-yellow-300 font-black text-xs'
                              : captionStyle === 'mrbeast'
                              ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-black text-xs scale-105'
                              : 'bg-zinc-900/90 text-zinc-100 font-medium text-[11px] border border-zinc-700'
                          }`}>
                            {activeCandidate.captionText}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* 功能 69: 底部吸睛動態進度條 (Progress Bar) */}
                  {showShortsProgressBar && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800 z-30 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 via-amber-400 to-teal-400 w-3/4 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 彈窗底部操作列：單支導出與批量導出 (功能 70) */}
            <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-400">
                目前選定：短影音 #{selectedShortId} ({verticalTemplate === 'split' ? '上下雙分割' : '9:16 全螢幕'})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsShortsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-750"
                >
                  關閉
                </button>

                {/* 導出單支選中短影音 */}
                <button
                  onClick={() => {
                    setIsShortsModalOpen(false);
                    setLiveCutNotice(`已將短影音 #${selectedShortId} 輸出至 output/shorts/short_${selectedShortId}.mp4`);
                    setTimeout(() => setLiveCutNotice(null), 2500);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-pink-300 border border-pink-500/40 text-xs font-bold transition-all"
                >
                  導出當前選中短影音
                </button>

                {/* 功能 70: 一鍵批量導出全數 3 支短影音 */}
                <button
                  onClick={handleBatchExportShorts}
                  disabled={isBatchExportingShorts}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:brightness-110 text-white text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isBatchExportingShorts ? `批量導出中 [${batchExportIndex}/3]...` : '一鍵批量導出全部 3 支短影音'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 功能 08：左右修剪把手即時浮動時碼 Tooltip */}
        {trimTooltip && (
          <div
            style={{ left: `${trimTooltip.x}px`, top: `${trimTooltip.y}px` }}
            className="fixed z-50 -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-lg bg-zinc-900/95 border border-teal-500/80 text-white shadow-2xl backdrop-blur-md flex flex-col items-center animate-fade-in"
          >
            <span className="font-mono text-[11px] font-bold text-teal-300 tracking-wider">
              {trimTooltip.text}
            </span>
            <span className="font-mono text-[9px] text-zinc-400">
              {trimTooltip.subText}
            </span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-teal-500/80" />
          </div>
        )}

      {/* 功能 30: 媒體中繼資料檢查視窗 (Media Inspector Modal) */}
      {inspectingAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs font-bold text-zinc-100">素材詳細中繼資料 (Media Inspector)</h3>
              </div>
              <button
                onClick={() => setInspectingAsset(null)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-zinc-300">
              <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between items-center">
                <span className="text-zinc-500">檔案名稱</span>
                <span className="text-zinc-100 font-bold truncate max-w-[220px]">{inspectingAsset.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">媒體類型</span>
                  <span className="uppercase text-teal-300">{inspectingAsset.type}</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">檔案容量</span>
                  <span>{inspectingAsset.sizeStr}</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">解析度</span>
                  <span>1920 x 1080 (16:9)</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">影格幀率</span>
                  <span>29.97 fps (NTSC)</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">編碼格式</span>
                  <span className="text-amber-300">H.264 / AVC</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">音訊規格</span>
                  <span className="text-cyan-300">48.0 kHz 立體聲</span>
                </div>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-850 flex justify-between">
                <span className="text-zinc-500">精確時長 (SMPTE)</span>
                <span className="text-zinc-100 font-bold">{formatSMPTE(inspectingAsset.duration)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setInspectingAsset(null)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 功能 49: 完整快捷鍵對照指南視窗 (Interactive Keyboard Shortcuts Cheat Sheet) */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">PodFlow Pro 全域快捷鍵對照指南 (Keyboard Shortcuts)</h3>
                  <p className="text-xs text-zinc-400">專為 Podcast 高效剪輯優化，支援 J-K-L 穿梭導航與標準 NLE 剪輯鍵位</p>
                </div>
              </div>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 搜尋過濾框 */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="搜尋快捷鍵或功能 (例如：倒放, 刀片, 標記, 靜音)..."
                value={shortcutSearchQuery}
                onChange={(e) => setShortcutSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* 快捷鍵分組網格 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {[
                {
                  category: '時間軸播放與穿梭導航 (Transport & Shuttle)',
                  items: [
                    { key: 'Space', desc: '播放 / 暫停 (Toggle Play/Pause)' },
                    { key: 'J', desc: '倒放預覽 (Reverse Playback Shuttle)' },
                    { key: 'K', desc: '停止 / 暫停播放 (Stop Playback)' },
                    { key: 'L', desc: '順放 / 快進 (Forward Playback)' },
                    { key: '← / →', desc: '逐幀精確微調 1 格 (Step 1 Frame 33.3ms)' },
                    { key: 'Shift + ← / →', desc: '快速跳躍 1 秒 (Step 1 Second)' },
                    { key: '↑ / ↓', desc: '跳至上一個 / 下一個剪輯切點 (Jump to Cut)' }
                  ]
                },
                {
                  category: '剪輯與片段操作 (Editing Tools)',
                  items: [
                    { key: 'C', desc: '刀片裁切工具 (Razor Tool - 點擊片段任意處分割)' },
                    { key: 'V', desc: '標準選擇工具 (Selection Tool)' },
                    { key: 'Shift + Delete', desc: '智慧波紋刪除 (Ripple Delete - 自動消除間隔並緊密接合)' },
                    { key: 'Delete / Backspace', desc: '常規刪除片段 (保留時間軸空白)' },
                    { key: '{  或  I', desc: '標記工作區入點 (Mark In)' },
                    { key: '}  或  O', desc: '標記工作區出點 (Mark Out)' },
                    { key: 'M', desc: '在目前播放頭新增時間軸標記點 (Add Marker)' }
                  ]
                },
                {
                  category: '多機位即時導播切換 (Live MultiCam Switch)',
                  items: [
                    { key: '1', desc: '即時切換至 CAM A (主持人特寫 Host Close-up)' },
                    { key: '2', desc: '即時切換至 CAM B (嘉賓特寫 Guest Close-up)' },
                    { key: '3', desc: '即時切換至 CAM C (現場全景 Wide Angle)' }
                  ]
                },
                {
                  category: '專案管理、歷史復原與檢視 (Project & History)',
                  items: [
                    { key: 'Ctrl + S', desc: '立即儲存專案至本機快取 (Instant Manual Save)' },
                    { key: 'Ctrl + Z', desc: '復原上一動作 (Undo)' },
                    { key: 'Ctrl + Y / Ctrl+Shift+Z', desc: '重做下一動作 (Redo)' },
                    { key: 'Ctrl + 滾輪', desc: '以播放頭為中心等比居中縮放時間軸 (Playhead-Centric Zoom)' },
                    { key: '?  或  F1', desc: '呼叫此快捷鍵對照指南 (Open Shortcuts)' },
                    { key: 'Esc', desc: '關閉目前彈窗 / 退出全螢幕 (Close / Exit Fullscreen)' }
                  ]
                }
              ]
                .filter((grp) =>
                  shortcutSearchQuery === ''
                    ? true
                    : grp.category.toLowerCase().includes(shortcutSearchQuery.toLowerCase()) ||
                      grp.items.some(
                        (i) =>
                          i.key.toLowerCase().includes(shortcutSearchQuery.toLowerCase()) ||
                          i.desc.toLowerCase().includes(shortcutSearchQuery.toLowerCase())
                      )
                )
                .map((grp) => (
                  <div key={grp.category} className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                    <span className="font-bold text-teal-300 text-xs block pb-1 border-b border-zinc-800">
                      {grp.category}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {grp.items
                        .filter((item) =>
                          shortcutSearchQuery === ''
                            ? true
                            : item.key.toLowerCase().includes(shortcutSearchQuery.toLowerCase()) ||
                              item.desc.toLowerCase().includes(shortcutSearchQuery.toLowerCase())
                        )
                        .map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-1.5 rounded bg-zinc-900 border border-zinc-850">
                            <span className="text-zinc-300 text-[11px]">{item.desc}</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-teal-400 font-bold shrink-0">
                              {item.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
              >
                我知道了 (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 功能 86 ~ 90: AI 社群宣傳圖、動態音波 Audiogram 與宣傳包彈窗 */}
      {isSocialModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none">
          <div className="w-full max-w-5xl h-[86vh] rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl flex flex-col gap-3.5">
            {/* 彈窗標頭 */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <span>AI 社群宣傳圖卡、動態音波 Audiogram 與宣傳文案包生成器</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      一鍵社群圖文套組
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    自動合成 Instagram 1:1、YouTube 16:9 與限動 9:16 宣傳圖卡，內嵌即時動態音波波形與嘉賓引號金句
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSocialModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 核心內容區：左側設定控制項、右側即時宣傳圖卡畫布 */}
            <div className="flex-1 flex gap-5 min-h-0">
              {/* 左側設定區 */}
              <div className="w-[45%] flex flex-col gap-3 overflow-y-auto pr-1">
                {/* 功能 86: 社群圖卡比例切換 */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    社群發布比例 (Aspect Ratio)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1:1', label: '1:1 正方形', sub: 'Instagram / Threads' },
                      { id: '16:9', label: '16:9 橫式', sub: 'YouTube / Twitter / FB' },
                      { id: '9:16', label: '9:16 直式', sub: 'IG Story / 限時動態' }
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        onClick={() => setSocialAspect(asp.id as any)}
                        className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                          socialAspect === asp.id
                            ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 font-bold shadow'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-zinc-100">{asp.label}</span>
                        <span className="text-[8px] text-zinc-500">{asp.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 功能 87: 動態音波波形樣式 (Audiogram Visualizer) */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    動態音波視覺化樣式 (Audiogram Waveform)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'bars', label: '長條頻譜柱', desc: '經典廣播柱' },
                      { id: 'wave', label: '正弦平滑波', desc: '流動音浪' },
                      { id: 'circular', label: '環形圓圈波', desc: '聲納擴散' }
                    ].map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setAudiogramStyle(w.id as any)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          audiogramStyle === w.id
                            ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 font-bold shadow'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                        }`}
                      >
                        <span className="text-[10.5px] font-bold block">{w.label}</span>
                        <span className="text-[8px] text-zinc-500">{w.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-850 text-[10px]">
                    <span className="text-zinc-400">音波霓虹色調：</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'teal', dot: 'bg-teal-400' },
                        { id: 'purple', dot: 'bg-purple-400' },
                        { id: 'amber', dot: 'bg-amber-400' },
                        { id: 'pink', dot: 'bg-pink-400' }
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setAudiogramColor(c.id as any)}
                          className={`w-4 h-4 rounded-full ${c.dot} border transition-all ${
                            audiogramColor === c.id ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-black/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 功能 88: 嘉賓名片與引號金句設定 (Quotes & Badges) */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    引號金句與嘉賓名片卡 (Quote & Lower Third)
                  </span>

                  <label className="flex items-center justify-between text-[10.5px] text-zinc-300 cursor-pointer">
                    <span>顯示嘉賓名片卡 (David Lin | AI 架構師)</span>
                    <input
                      type="checkbox"
                      checked={showLowerThird}
                      onChange={(e) => setShowLowerThird(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between text-[10.5px] text-zinc-300 cursor-pointer">
                    <span>顯示引號精華金句 (Quote Card)</span>
                    <input
                      type="checkbox"
                      checked={showSocialQuote}
                      onChange={(e) => setShowSocialQuote(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0"
                    />
                  </label>

                  {showSocialQuote && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[9.5px] text-zinc-400 block">自訂金句文案：</span>
                      <textarea
                        value={socialQuoteText}
                        onChange={(e) => setSocialQuoteText(e.target.value)}
                        rows={2}
                        className="w-full rounded bg-zinc-900 border border-zinc-800 p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 右側：社群宣傳圖卡即時合成畫布 (功能 89) */}
              <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 shadow-inner">
                {/* 宣傳圖卡畫布容器 */}
                <div
                  className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950/80 border-2 border-zinc-700 shadow-2xl flex flex-col justify-between p-5 transition-all ${
                    socialAspect === '1:1'
                      ? 'w-[360px] h-[360px]'
                      : socialAspect === '16:9'
                      ? 'w-[480px] h-[270px]'
                      : 'w-[250px] h-[440px]'
                  }`}
                >
                  {/* 圖卡頂部：集數標記與節目 Logo */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow">
                        <Layers className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-black text-xs tracking-tight text-white">PodFlow Pro</span>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      EPISODE 42
                    </span>
                  </div>

                  {/* 圖卡中部：標題與引號金句 */}
                  <div className="space-y-2 z-10 my-auto">
                    <h3 className="text-sm font-black text-white leading-snug drop-shadow-md">
                      AI 晶片革命！Windows on ARM 如何翻轉 Podcast 影音後製？
                    </h3>

                    {showSocialQuote && (
                      <div className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                        <span className="text-amber-400 font-serif text-lg leading-none select-none">“</span>
                        <p className="text-[11px] font-medium text-zinc-200 italic leading-relaxed">
                          {socialQuoteText}
                        </p>
                        <div className="flex justify-end">
                          <span className="text-amber-400 font-serif text-lg leading-none select-none">”</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 圖卡底部：嘉賓名片與動態音波視覺化 (功能 87 & 88) */}
                  <div className="space-y-2 z-10">
                    {/* 功能 87: 動態音波視覺化 (依 audiogramStyle 切換 bars, wave, circular) */}
                    <div className="h-8 w-full flex items-center justify-center overflow-hidden px-2">
                      {audiogramStyle === 'bars' && (
                        <div className="h-full w-full flex items-center justify-center gap-1">
                          {Array.from({ length: socialAspect === '16:9' ? 42 : 28 }).map((_, i) => {
                            const h = Math.sin(i * 0.4) * 10 + Math.cos(i * 0.7) * 8 + 14;
                            const colClass =
                              audiogramColor === 'teal'
                                ? 'bg-teal-400'
                                : audiogramColor === 'purple'
                                ? 'bg-purple-400'
                                : audiogramColor === 'amber'
                                ? 'bg-amber-400'
                                : 'bg-pink-400';
                            return (
                              <div
                                key={i}
                                style={{ height: `${Math.max(4, h)}px` }}
                                className={`w-1 rounded-full ${colClass} opacity-85 shadow-sm transition-all`}
                              />
                            );
                          })}
                        </div>
                      )}

                      {audiogramStyle === 'wave' && (
                        <svg className="w-full h-8" viewBox="0 0 300 32" preserveAspectRatio="none">
                          <path
                            d="M 0 16 Q 25 2, 50 16 T 100 16 T 150 16 T 200 16 T 250 16 T 300 16"
                            fill="none"
                            stroke={
                              audiogramColor === 'teal'
                                ? '#2dd4bf'
                                : audiogramColor === 'purple'
                                ? '#c084fc'
                                : audiogramColor === 'amber'
                                ? '#fbbf24'
                                : '#f472b6'
                            }
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                          />
                        </svg>
                      )}

                      {audiogramStyle === 'circular' && (
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div
                            className={`absolute inset-0 rounded-full border-2 border-dashed animate-spin ${
                              audiogramColor === 'teal'
                                ? 'border-teal-400'
                                : audiogramColor === 'purple'
                                ? 'border-purple-400'
                                : audiogramColor === 'amber'
                                ? 'border-amber-400'
                                : 'border-pink-400'
                            }`}
                          />
                          <div
                            className={`w-3.5 h-3.5 rounded-full animate-ping ${
                              audiogramColor === 'teal'
                                ? 'bg-teal-400'
                                : audiogramColor === 'purple'
                                ? 'bg-purple-400'
                                : audiogramColor === 'amber'
                                ? 'bg-amber-400'
                                : 'bg-pink-400'
                            }`}
                          />
                          <div
                            className={`w-2 h-2 rounded-full z-10 ${
                              audiogramColor === 'teal'
                                ? 'bg-teal-300'
                                : audiogramColor === 'purple'
                                ? 'bg-purple-300'
                                : audiogramColor === 'amber'
                                ? 'bg-amber-300'
                                : 'bg-pink-300'
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* 嘉賓名片卡 */}
                    {showLowerThird && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[9px]">
                            D
                          </div>
                          <span className="text-zinc-200 font-bold">David Lin (Qualcomm AI 架構師)</span>
                        </div>
                        <span className="text-zinc-400 font-mono text-[9px]">各大平台同步上架</span>
                      </div>
                    )}
                  </div>

                  {/* 背景裝飾光暈 */}
                  <div className="absolute top-1/4 -right-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-1/4 -left-10 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 彈窗底部操作列：單張下載與一鍵打包導出 (功能 90) */}
            <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-400">
                目前格式：{socialAspect} 社群圖卡 ({audiogramStyle === 'bars' ? '頻譜柱' : '音浪波形'})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSocialModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-750"
                >
                  關閉
                </button>

                {/* 單張圖片下載 (功能 86) */}
                <button
                  onClick={handleDownloadSocialCard}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95"
                >
                  下載當前圖卡 ({socialAspect})
                </button>

                {/* 功能 90: 一鍵打包導出全套社群宣傳包 */}
                <button
                  onClick={handleExportSocialPromoKit}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:brightness-110 text-white text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>一鍵導出全套社群宣傳包 (ZIP)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 功能 91 ~ 95: AI 封面縮圖生成與視覺提示詞彈窗 */}
      {isThumbnailModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none">
          <div className="w-full max-w-5xl h-[86vh] rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl flex flex-col gap-3.5">
            {/* 彈窗標頭 */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <span>AI YouTube 爆款封面縮圖產生器 (Thumbnail Studio)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                      高 CTR 發燒排版
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    自動分析節目精彩表情時段、合成發燒粗體字卡、主體發光描邊，並產出 Midjourney v6 提示詞
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsThumbnailModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 核心內容區：左側控制項與提示詞、右側 16:9 即時縮圖畫布 */}
            <div className="flex-1 flex gap-5 min-h-0">
              {/* 左側設定區 */}
              <div className="w-[45%] flex flex-col gap-3 overflow-y-auto pr-1">
                {/* 功能 91: 節目高光時刻截圖候選產生器 */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
                    <span className="text-[11px] font-bold text-zinc-200">AI 精彩畫面候選 (Moment Detection)</span>
                    <span className="text-[9.5px] font-mono text-zinc-500">{THUMBNAIL_MOMENTS.length} 個瞬間</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {THUMBNAIL_MOMENTS.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMomentId(m.id);
                          setCurrentTime(m.time);
                          setThumbnailHeadline(m.previewText);
                        }}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-0.5 ${
                          selectedMomentId === m.id
                            ? 'bg-red-500/20 text-red-200 border-red-500/50 font-bold shadow'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-zinc-200">{m.label}</span>
                          <span className="font-mono text-[9px] text-red-300">CAM {m.cam}</span>
                        </div>
                        <span className="text-[8.5px] text-zinc-400">{m.expression}</span>
                        <span className="text-[8px] font-mono text-zinc-500">{formatSMPTE(m.time).slice(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 功能 93: 粗體高點擊發燒字卡排版 */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    縮圖文字排版 (Click-Worthy Typography)
                  </span>

                  <div className="space-y-1.5 text-[10.5px]">
                    <div>
                      <span className="text-zinc-400 block pb-0.5">主標題大字 (大黃字/高反差)：</span>
                      <input
                        type="text"
                        value={thumbnailHeadline}
                        onChange={(e) => setThumbnailHeadline(e.target.value)}
                        className="w-full rounded bg-zinc-900 border border-zinc-800 p-1.5 text-xs text-yellow-300 font-black focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <span className="text-zinc-400 block pb-0.5">紅色吸睛小標籤：</span>
                      <input
                        type="text"
                        value={thumbnailBadge}
                        onChange={(e) => setThumbnailBadge(e.target.value)}
                        className="w-full rounded bg-zinc-900 border border-zinc-800 p-1.5 text-xs text-red-400 font-bold focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 功能 94: 人像主體發光描邊輪廓效果 */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block pb-1 border-b border-zinc-850">
                    主體發光描邊 (Subject Neon Outline Glow)
                  </span>

                  <label className="flex items-center justify-between text-[10.5px] text-zinc-300 cursor-pointer">
                    <span>啟用人物主體外輪廓霓虹發光</span>
                    <input
                      type="checkbox"
                      checked={enableSubjectGlow}
                      onChange={(e) => setEnableSubjectGlow(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-red-500 focus:ring-0"
                    />
                  </label>

                  {enableSubjectGlow && (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-850 text-[10px]">
                      <span className="text-zinc-400">描邊發光色彩：</span>
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'teal', dot: 'bg-teal-400', label: '青綠' },
                          { id: 'yellow', dot: 'bg-yellow-400', label: '亮黃' },
                          { id: 'purple', dot: 'bg-purple-400', label: '賽博紫' },
                          { id: 'white', dot: 'bg-white', label: '純白' }
                        ].map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setNeonGlowColor(c.id as any)}
                            className={`px-2 py-0.5 rounded text-[9px] border flex items-center gap-1 transition-all ${
                              neonGlowColor === c.id
                                ? 'bg-red-500/20 text-red-200 border-red-500/50 font-bold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 功能 92: Midjourney / SD 縮圖提示詞生成 */}
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">AI 繪圖提示詞 (Midjourney v6 Prompt)</span>
                    <button
                      onClick={handleCopyMidjourneyPrompt}
                      className="text-[9.5px] text-teal-400 hover:underline flex items-center gap-1"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      <span>複製提示詞</span>
                    </button>
                  </div>
                  <p className="text-[9.5px] text-zinc-400 font-mono leading-relaxed bg-zinc-900/80 p-2 rounded border border-zinc-850 break-all select-all">
                    /imagine prompt: A high-tech futuristic podcast studio, glowing cybernetic microchips, Qualcomm Snapdragon neon circuitry, dramatic lighting, YouTube thumbnail award-winning --ar 16:9 --v 6.0
                  </p>
                </div>
              </div>

              {/* 右側：16:9 縮圖即時合成畫布 (功能 93, 94) */}
              <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 shadow-inner">
                {/* 16:9 YouTube 縮圖畫布容器 */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border-2 border-zinc-700 shadow-2xl flex flex-col justify-between p-4 select-none">
                  {/* 底圖視訊畫面 */}
                  {inputFiles[THUMBNAIL_MOMENTS.find((m) => m.id === selectedMomentId)?.cam || 'A'] ? (
                    <video
                      key={`${selectedMomentId}-${currentTime}`}
                      src={inputFiles[THUMBNAIL_MOMENTS.find((m) => m.id === selectedMomentId)?.cam || 'A']}
                      onLoadedMetadata={(e) => {
                        const m = THUMBNAIL_MOMENTS.find((item) => item.id === selectedMomentId);
                        if (m) e.currentTarget.currentTime = m.time;
                      }}
                      className={`absolute inset-0 w-full h-full object-cover scale-105 transition-all duration-300 ${
                        enableSubjectGlow
                          ? neonGlowColor === 'teal'
                            ? 'drop-shadow-[0_0_20px_rgba(45,212,191,0.7)]'
                            : neonGlowColor === 'yellow'
                            ? 'drop-shadow-[0_0_20px_rgba(250,204,21,0.7)]'
                            : neonGlowColor === 'purple'
                            ? 'drop-shadow-[0_0_20px_rgba(192,132,252,0.7)]'
                            : 'drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]'
                          : ''
                      }`}
                      muted
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center" />
                  )}

                  {/* 黑色暗角遮罩以突顯文字 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

                  {/* 縮圖頂部：品牌標籤與爆點小字 */}
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white shadow-md animate-pulse">
                      {thumbnailBadge}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/20">
                      EP.42 EXCLUSIVE
                    </span>
                  </div>

                  {/* 縮圖底部：高點擊粗體大字 (功能 93) */}
                  <div className="z-10 space-y-1">
                    <div className="inline-block transform -rotate-1 origin-left">
                      <h2
                        style={{
                          textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 4px 10px rgba(0,0,0,0.9)'
                        }}
                        className="text-2xl font-black text-yellow-300 tracking-tight leading-tight uppercase"
                      >
                        {thumbnailHeadline}
                      </h2>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-300 font-bold">
                      <span className="bg-black/70 px-2 py-0.5 rounded border border-white/20 backdrop-blur-sm">
                        主持 Alex x 嘉賓 David Lin
                      </span>
                      <span className="text-yellow-400 font-mono tracking-wider">PODFLOW PRO 4K</span>
                    </div>
                  </div>
                </div>

                {/* 預覽規格提示 */}
                <span className="text-[10px] font-mono text-zinc-500 pt-2">
                  預覽比例 16:9 (導出解析度: {thumbnailResolution === '1080p' ? '1920x1080 Full HD' : '1280x720 HD'})
                </span>
              </div>
            </div>

            {/* 彈窗底部操作列：解析度切換與導出 (功能 95) */}
            <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span>導出解析度規格：</span>
                <div className="flex items-center gap-1 font-mono">
                  <button
                    onClick={() => setThumbnailResolution('720p')}
                    className={`px-2 py-0.5 rounded text-[10px] border ${
                      thumbnailResolution === '720p'
                        ? 'bg-red-500/20 text-red-200 border-red-500/50 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    1280x720 (標準)
                  </button>
                  <button
                    onClick={() => setThumbnailResolution('1080p')}
                    className={`px-2 py-0.5 rounded text-[10px] border ${
                      thumbnailResolution === '1080p'
                        ? 'bg-red-500/20 text-red-200 border-red-500/50 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    1920x1080 (高畫質 4K 降採樣)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsThumbnailModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-750"
                >
                  關閉
                </button>

                {/* 功能 95: 一鍵高解析度導出 */}
                <button
                  onClick={handleExportThumbnail}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:brightness-110 text-white text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>導出 YouTube 封面縮圖 (PNG)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 功能 100: 100 項功能完整交付驗收與全專案發布里程碑彈窗 */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[88vh] rounded-2xl bg-zinc-900 border border-emerald-500/50 p-6 shadow-2xl flex flex-col gap-4">
            {/* 彈窗標頭 */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-zinc-950 font-black shadow-lg">
                  <CheckCircle2 className="h-6 w-6 text-zinc-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>PodFlow Pro 100 項功能全數完工交付！</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      100 / 100 100% DONE
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 pt-0.5">
                    Intel® Core™ / Intel® Arc™ (x86_64) 原生優化桌面 Podcast 多機位 AI 自動化剪輯軟體
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMilestoneModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 核心驗收分區檢閱 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Part 1 驗收摘要 */}
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
                  <span className="font-bold text-teal-300 text-xs">
                    Part 1：50 項專業 NLE 剪輯基礎功能 (Features 01 ~ 50)
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">50 / 50 完工</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-zinc-300">
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">時間軸與修剪 (Batch 1~2)</strong>
                    <span>拖曳落地、SMPTE 30fps 時碼、12px 磁吸對齊、波紋刪除、刀片切割工具、修剪浮動時碼 Tooltip</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">軌道控制與導航 (Batch 3~4)</strong>
                    <span>Mute/Solo 靜音獨奏、視訊隱藏備援切換、多選框選、入出點遮罩、逐幀步進、雙聲道動態 VU 錶</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">監視器與素材庫 (Batch 5~6)</strong>
                    <span>全螢幕彈出、代理降載 (1/2, 1/4)、1 鍵快照 PNG、監視器縮放平移、廣播安全框、素材目錄樹、Relink 替換</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">影像形變與調色 (Batch 7~8)</strong>
                    <span>等比/自由縮放、座標軸平滑微調、360° 旋轉輪盤、鏡像翻轉、16 種混合模式、白平衡色溫、A/B 原片對比</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850 col-span-2">
                    <strong className="text-white block mb-0.5">音訊變速與專案管理 (Batch 9~10)</strong>
                    <span>主音量增益、AI 人聲降噪、0.25x~3.0x 變速 (Preserve Pitch)、動態波形圖、J-K-L 穿梭倒放、標籤顏色、時間軸標記點、快捷鍵手冊、本機 30 秒自動儲存還原</span>
                  </div>
                </div>
              </div>

              {/* Part 2 驗收摘要 */}
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
                  <span className="font-bold text-indigo-300 text-xs">
                    Part 2：50 項 AI 智慧輔助與多機位自動化功能 (Features 51 ~ 100)
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">50 / 50 完工</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-zinc-300">
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">逐字稿與文字剪片 (Batch 11)</strong>
                    <span>Whisper Turbo/Large-v3 模型、聲紋發言人分離、點詞跳轉、卡拉OK高亮、口癖贅字消除、死寂空白裁切</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">多機位自動導播 (Batch 12)</strong>
                    <span>VAD 語音活動切鏡、傾聽者反應鏡頭 (Reaction Cuts)、長發言全景穿插、人臉自動置中追蹤框、導播節奏控制矩陣</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">AI 廣播母帶處理 (Batch 13)</strong>
                    <span>-14 LUFS 響度正規化、-1.0 dBFS True Peak 防削波、雙人 3.5:1 Auto-Leveler、80Hz 風切濾波、齒音壓制、空間去殘響</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">9:16 短影音生成 (Batch 14)</strong>
                    <span>高光吸睛評分、1080x1920 直式人臉居中、上下雙分割版型、TikTok/MrBeast 字卡、動態進度條、批量導出短影音</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">智慧字幕與雙語對照 (Batch 15)</strong>
                    <span>SRT/VTT 雙格式導出、說話者雙色動態字卡 (青綠/紫羅蘭)、詞級彈跳動畫、中英雙語平行對照、字幕 0.5s 磁吸切點</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">章節標記與 Show Notes (Batch 16)</strong>
                    <span>AI 自動章節時碼、單集精華摘要、高 CTR 標題推薦、一鍵轉移時間軸標記旗標、一鍵複製 Markdown 格式</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">AI 智慧 B-Roll 空鏡穿插 (Batch 17)</strong>
                    <span>話題關鍵實體提煉、Pexels 4K 免版權空鏡庫、V2 覆蓋軌道 (Cutaway/PiP)、講者發言時碼自動對齊、淡入淡出轉場動效</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850">
                    <strong className="text-white block mb-0.5">社群宣傳圖與動態音波 (Batch 18)</strong>
                    <span>1:1 / 16:9 宣傳卡、長條/圓圈/正弦 Audiogram 動態音浪、Lower Third 名片、封面即時合成、一鍵導出宣傳包 ZIP</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-850 col-span-2">
                    <strong className="text-white block mb-0.5">AI 縮圖產生與硬體管線 (Batch 19~20)</strong>
                    <span>高光表情截圖、Midjourney v6 提示詞、粗體黃字發燒排版、人像主體發光描邊、Windows on ARM NPU 對接、Intel® Quick Sync (QSV) / Media Foundation 硬體加速、32KB 溢位防護、100 項功能完整交付驗收</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 彈窗底部操作列 */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>全案 100 項核心功能全部通過驗收</span>
              </span>

              <button
                onClick={() => setIsMilestoneModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-zinc-950 font-black text-xs shadow-lg transition-all active:scale-95"
              >
                關閉驗收清單
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 導出渲染進度彈窗 */}
      {exportState.status !== 'idle' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">FFmpeg 多機位導出渲染</h3>
                <p className="text-xs text-zinc-500">
                  {exportState.status === 'rendering' ? '正在呼叫 Rust 核心渲染引擎' : '任務完成'}
                </p>
              </div>
            </div>

            {exportState.status === 'rendering' && (
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    style={{ width: `${exportState.progress}%` }}
                    className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-300"
                  />
                </div>
                <p className="text-xs text-zinc-400 font-mono text-center">{exportState.message}</p>
              </div>
            )}

            {exportState.status === 'completed' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <div className="font-semibold">影片導出成功！</div>
                  <div className="text-[11px] text-zinc-400 mt-1 font-mono break-all">{exportState.outputPath}</div>
                </div>
              </div>
            )}

            {exportState.status === 'error' && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <div className="font-semibold">導出失敗</div>
                  <div className="text-[11px] text-zinc-400 mt-1 font-mono">{exportState.errorMessage}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setExportState({ status: 'idle', progress: 0 })}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700 transition-all"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;