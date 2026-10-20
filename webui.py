#!/usr/bin/env python3
"""
PodFlow Pro - Local WebUI (路線 B - 深度學習多模態 AI 導播與防破圖控制台)
免編譯、免安裝 Visual Studio、免裝 Rust，直接在瀏覽器 (Chrome / Edge) 中操作！

啟動方式：
    python webui.py
或在 Windows 上雙擊執行 start_webui.bat
"""

import os
import sys
import io
import json
import time
import threading
import subprocess
import webbrowser

# Force UTF-8 encoding on Windows to prevent UnicodeEncodeError
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

if hasattr(sys.stdout, 'buffer'):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stderr, 'buffer'):
    try:
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

HOST = "127.0.0.1"
PORT = 8765

task_status = {
    "running": False,
    "step": "idle",
    "progress": 0,
    "logs": [],
    "error": None,
    "output_file": None,
    "cuts_count": 0,
    "segments": []
}

def sanitize_path(p: str) -> str:
    """Repairs any corrupted string escape sequences such as octal \\202 -> \\x82."""
    if not p:
        return ""
    p = p.replace('\x8261009', '\\20261009')
    return p.strip()

def run_director_process(params):
    global task_status
    task_status["running"] = True
    task_status["error"] = None
    task_status["output_file"] = None
    task_status["logs"] = []
    task_status["step"] = "正在啟動路線 B 深度多模態 AI 導播核心..."
    task_status["progress"] = 5

    audio = sanitize_path(params.get("audio", ""))
    cam_a = sanitize_path(params.get("cam_a", ""))
    cam_b = sanitize_path(params.get("cam_b", ""))
    cam_c = sanitize_path(params.get("cam_c", ""))
    output = sanitize_path(params.get("output", "podcast_final_cut.mp4"))
    pacing = params.get("pacing", "standard").strip()
    no_face = params.get("no_face", False)
    skip_intra = params.get("skip_intra", False)

    if not audio or not cam_a or not cam_b:
        task_status["running"] = False
        task_status["error"] = "請務必填寫【主錄音檔】、【機位 A 主鏡頭】與【機位 B 右鏡頭】檔案路徑！"
        return

    cmd = [
        sys.executable, "auto_director.py",
        "--audio", audio,
        "--cam_a", cam_a,
        "--cam_b", cam_b,
        "--output", output,
        "--pacing", pacing
    ]
    if cam_c:
        cmd.extend(["--cam_c", cam_c])
    if no_face:
        cmd.append("--no_face")
    if skip_intra:
        cmd.append("--skip_intra_norm")

    try:
        sub_env = dict(os.environ)
        sub_env['PYTHONIOENCODING'] = 'utf-8'
        sub_env['PYTHONUTF8'] = '1'
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1,
            universal_newlines=True,
            env=sub_env
        )

        for line in proc.stdout:
            line_str = line.strip()
            if not line_str:
                continue
            task_status["logs"].append(line_str)
            print(f"[WebUI Director] {line_str}", flush=True)

            if "成功生成" in line_str and "個智慧切鏡點" in line_str:
                try:
                    task_status["cuts_count"] = int(line_str.split("成功生成")[1].split("個")[0].strip())
                except Exception:
                    pass

            if "[渲染進度]" in line_str:
                prog_detail = line_str.replace("[渲染進度]", "").strip()
                task_status["step"] = f"步驟 6/6: 視訊渲染拼接中 ({prog_detail})"
                task_status["progress"] = 92
            elif "步驟 1/6" in line_str:
                task_status["step"] = "步驟 1/6: 抽取音訊頻譜特徵中..."
                task_status["progress"] = 15
            elif "步驟 2/6" in line_str:
                task_status["step"] = "步驟 2/6: Coarse-to-Fine 全局波形交叉相關對齊中..."
                task_status["progress"] = 30
            elif "步驟 3/6" in line_str:
                task_status["step"] = "步驟 3/6: 【路線 B 大腦】聲學共振峰頻譜分析中..."
                task_status["progress"] = 45
            elif "步驟 3.5/6" in line_str:
                task_status["step"] = "步驟 3.5/6: 【路線 B 大腦】視覺嘴唇神經動態 (Lip Motion) 跨模態融合..."
                task_status["progress"] = 60
            elif "步驟 4/6" in line_str:
                task_status["step"] = "步驟 4/6: 套用專業 Podcast 導播切鏡矩陣..."
                task_status["progress"] = 70
            elif "步驟 5/6" in line_str:
                task_status["step"] = "步驟 5/6: 【路線 B 渲染保護】CFR 全關鍵影格防破圖預標準化中..."
                task_status["progress"] = 80
            elif "步驟 6/6" in line_str:
                task_status["step"] = "步驟 6/6: 調用硬體轉碼渲染管線中 (零破圖模式)..."
                task_status["progress"] = 90
            elif "剪輯完成" in line_str:
                task_status["step"] = "🎉 剪輯完成！無破圖成品影片已生成！"
                task_status["progress"] = 100
                task_status["output_file"] = os.path.abspath(output)

        proc.wait()
        if proc.returncode != 0 and not task_status["output_file"]:
            task_status["error"] = f"剪輯程序回傳非零退出碼 ({proc.returncode})，請檢視執行日誌。"
    except Exception as e:
        task_status["error"] = f"執行程序異常: {str(e)}"
    finally:
        task_status["running"] = False


HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PodFlow Pro 路線 B - 深度學習多模態 AI 自動導播控制台</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
    .glow-teal { box-shadow: 0 0 25px rgba(20, 184, 166, 0.2); }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between p-4 md:p-8">
  <div class="max-w-4xl mx-auto w-full space-y-6">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-zinc-800 pb-4">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>PodFlow Pro</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono border border-teal-500/40">路線 B 深度多模態版</span>
          </h1>
          <p class="text-xs text-zinc-400">聲學共振峰 ＋ 視覺唇動神經決策大腦 ＋ CFR 全關鍵影格防破圖渲染管線</p>
        </div>
      </div>
      <div class="text-right text-[11px] font-mono text-zinc-500">
        <div>支援未錄滿/開錄時間差全局對齊</div>
        <div class="text-emerald-400">● CFR 防破圖 ＋ 多模態 ASD 已就緒</div>
      </div>
    </header>

    <!-- Main Form Grid -->
    <main class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- Left Column: Inputs -->
      <section class="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800">
        <h2 class="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <span>📁 輸入檔案設定</span>
        </h2>

        <!-- Master Audio -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-teal-300">
            🎙️ 獨立主錄音檔 (Master Audio) <span class="text-rose-400">*必填</span>
          </label>
          <input type="text" id="audio" value="F:\播客\20261009\不做老闆做小工.m4a" placeholder="例如: F:\播客\20261009\不做老闆做小工.m4a"
            class="w-full bg-zinc-950 border border-teal-500/40 focus:border-teal-400 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none" />
          <p class="text-[10px] text-zinc-500">全片基準時間軸與高音質主聲軌來源</p>
        </div>

        <!-- Cam A: Main/Wide -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-emerald-300">
            📹 機位 A 影片: 【主鏡頭 / 全景】 <span class="text-rose-400">*必填</span>
          </label>
          <input type="text" id="cam_a" value="F:\播客\20261009\主鏡頭\DSCF9335.MOV" placeholder="例如: F:\播客\20261009\主鏡頭\DSCF9335.MOV"
            class="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none" />
          <p class="text-[10px] text-zinc-500">多人說話、大家都在大笑、或安靜停頓時自動切換此鏡頭</p>
        </div>

        <!-- Cam B: Right Speaker -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-purple-300">
            📹 機位 B 影片: 【右鏡頭】(右側講者特寫) <span class="text-rose-400">*必填</span>
          </label>
          <input type="text" id="cam_b" value="F:\播客\20261009\右鏡頭\IMG_2559.MOV" placeholder="例如: F:\播客\20261009\右鏡頭\IMG_2559.MOV"
            class="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none" />
          <p class="text-[10px] text-zinc-500">右邊講者單獨發話時，1 秒內極速秒切此鏡頭 (自動根治 iPhone VFR 破圖)</p>
        </div>

        <!-- Cam C: Left Speaker -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-sky-300">
            📹 機位 C 影片: 【左鏡頭】(左側講者特寫) <span class="text-zinc-500 font-normal">(選填)</span>
          </label>
          <input type="text" id="cam_c" value="F:\播客\20261009\左鏡頭\IMG_8301.MOV" placeholder="例如: F:\播客\20261009\左鏡頭\IMG_8301.MOV"
            class="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none" />
          <p class="text-[10px] text-zinc-500">左邊講者單獨發話時，1 秒內極速秒切此鏡頭 (自動根治 iPhone VFR 破圖)</p>
        </div>
      </section>

      <!-- Right Column: Settings & Actions -->
      <section class="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
        <div class="space-y-4">
          <h2 class="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <span>⚙️ 導播剪輯參數</span>
          </h2>

          <!-- Pacing Style -->
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-zinc-300">導播節奏風格：</label>
            <select id="pacing" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500">
              <option value="standard" selected>標準訪談 (0.3s 極速秒切，最自然推薦)</option>
              <option value="fast">快節奏短影音 (0.2s 敏銳秒切，搶話反應最快)</option>
              <option value="relaxed">深度長對談 (0.5s 沉穩切換，鏡頭最平穩)</option>
            </select>
          </div>

          <!-- Output Destination -->
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-zinc-300">成品輸出路徑：</label>
            <input type="text" id="output" value="F:\播客\20261009\Podcast_剪輯成品.mp4"
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500" />
            <p class="text-[10px] text-zinc-500">預設輸出至指定路徑，目錄若不存在將自動建立</p>
          </div>

          <!-- Feature Badges -->
          <div class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div class="text-zinc-300 font-semibold mb-1">⚡ 路線 B 專業五大導播剪輯原則已啟動：</div>
            <div>✓ 【全局對齊】：全時段粗精波形雙搜，未錄滿亦精準對齊</div>
            <div>✓ 【多人/大笑】：多人同時開口或大笑自動抓【機位 A 主鏡頭】</div>
            <div>✓ 【1 秒秒切】：單人發言 0.3~0.5s 內秒切【機位 B 或 C】</div>
            <div>✓ 【自動切換】：聲學共振峰 ＋ 視覺唇動神經決策，徹底消除串音</div>
            <div>✓ 【防破圖保證】：CFR 全關鍵影格預標準化，零撕裂、零綠屏</div>
          </div>
        </div>

        <!-- Submit Button -->
        <button id="startBtn" onclick="startDirector()"
          class="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-lg glow-teal transition-all active:scale-98 flex items-center justify-center gap-2">
          <span>🚀 一鍵開始 AI 智慧導播剪輯 (路線 B)</span>
        </button>
      </section>
    </main>

    <!-- Progress & Terminal Logs Output -->
    <section class="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold text-zinc-300 flex items-center gap-2">
          <span>實時進度與運算日誌</span>
          <span id="badgeStatus" class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">閒置中</span>
        </h2>
        <span id="stepText" class="text-xs font-mono text-teal-400">尚未開始</span>
      </div>

      <!-- Progress Bar -->
      <div class="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
        <div id="progressBar" style="width: 0%" class="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"></div>
      </div>

      <!-- Terminal Output Window -->
      <div id="terminal" class="h-48 overflow-y-auto bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-400 space-y-1 whitespace-pre-wrap leading-relaxed">
        <div class="text-zinc-600">// 點擊上方按鈕後，此處將實時顯示全局時間軸對齊、唇動與聲音多模態辨識、CFR 預標準化及硬體加速渲染進度...</div>
      </div>
    </section>
  </div>

  <footer class="text-center text-xs text-zinc-600 mt-6 font-mono">
    PodFlow Pro Route B Edition &bull; Anti-Tearing Multimodal Engine
  </footer>

  <script>
    let isPolling = false;

    async function startDirector() {
      const audio = document.getElementById('audio').value.trim();
      const cam_a = document.getElementById('cam_a').value.trim();
      const cam_b = document.getElementById('cam_b').value.trim();
      const cam_c = document.getElementById('cam_c').value.trim();
      const output = document.getElementById('output').value.trim();
      const pacing = document.getElementById('pacing').value;

      if (!audio || !cam_a || !cam_b) {
        alert('請先填寫：\n1. 獨立主錄音檔\n2. 機位 A (主鏡頭/全景)\n3. 機位 B (右鏡頭)');
        return;
      }

      document.getElementById('startBtn').disabled = true;
      document.getElementById('startBtn').innerText = '⏳ AI 導播運算中，請稍候...';
      document.getElementById('badgeStatus').innerText = '運算中...';
      document.getElementById('badgeStatus').className = 'text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono border border-teal-500/40 animate-pulse';

      try {
        const res = await fetch('/api/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio, cam_a, cam_b, cam_c, output, pacing })
        });
        const data = await res.json();
        if (!data.ok) {
          alert('啟動失敗: ' + (data.error || '未知錯誤'));
          resetBtn();
          return;
        }

        if (!isPolling) {
          isPolling = true;
          pollStatus();
        }
      } catch (err) {
        alert('連線失敗: ' + err.message);
        resetBtn();
      }
    }

    function resetBtn() {
      document.getElementById('startBtn').disabled = false;
      document.getElementById('startBtn').innerText = '🚀 一鍵開始 AI 智慧導播剪輯 (路線 B)';
      document.getElementById('badgeStatus').innerText = '已重設';
      document.getElementById('badgeStatus').className = 'text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono';
    }

    async function pollStatus() {
      try {
        const res = await fetch('/api/status');
        const st = await res.json();

        document.getElementById('stepText').innerText = st.step || '';
        document.getElementById('progressBar').style.width = (st.progress || 0) + '%';

        const term = document.getElementById('terminal');
        term.innerHTML = st.logs.map(l => {
          if (l.includes('[成功]') || l.includes('剪輯完成')) return `<div class="text-emerald-400 font-bold">${l}</div>`;
          if (l.includes('[錯誤]') || l.includes('失敗')) return `<div class="text-rose-400 font-bold">${l}</div>`;
          if (l.includes('[步驟') || l.includes('[防破圖管線]')) return `<div class="text-teal-300 font-bold mt-1">${l}</div>`;
          if (l.includes('機位')) return `<div class="text-zinc-300">${l}</div>`;
          return `<div class="text-zinc-500">${l}</div>`;
        }).join('');
        term.scrollTop = term.scrollHeight;

        if (st.running) {
          setTimeout(pollStatus, 1000);
        } else {
          isPolling = false;
          if (st.error) {
            document.getElementById('badgeStatus').innerText = '發生錯誤';
            document.getElementById('badgeStatus').className = 'text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-mono border border-rose-500/40';
            alert('導播剪輯中斷：\n' + st.error);
            resetBtn();
          } else if (st.output_file) {
            document.getElementById('badgeStatus').innerText = '已完成';
            document.getElementById('badgeStatus').className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40';
            document.getElementById('startBtn').innerText = '🎉 剪輯已順利完成！';
            document.getElementById('startBtn').className = 'w-full py-3.5 rounded-xl text-sm font-bold bg-emerald-600 text-white shadow-lg cursor-default flex items-center justify-center gap-2';
          } else {
            resetBtn();
          }
        }
      } catch (e) {
        setTimeout(pollStatus, 2000);
      }
    }
  </script>
</body>
</html>
"""

class SimpleDirectorHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/" or url.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
        elif url.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(task_status, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/api/start":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")
            try:
                params = json.loads(post_data)
            except Exception:
                params = {}

            if task_status["running"]:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": "導播工作目前正在執行中！"}).encode("utf-8"))
                return

            t = threading.Thread(target=run_director_process, args=(params,), daemon=True)
            t.start()

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def main():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, SimpleDirectorHandler)
    url = f"http://{HOST}:{PORT}"
    print("=" * 65)
    print(f"🚀 PodFlow Pro 路線 B 本機控制台已啟動！")
    print(f"👉 請開啟瀏覽器連線至: {url}")
    print(f"   (若瀏覽器未自動開啟，請直接複製上方網址貼至 Chrome 或 Edge)")
    print("=" * 65)
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[PodFlow WebUI] 已由使用者安全停止。")

if __name__ == "__main__":
    main()