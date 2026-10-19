# PodFlow Pro - Multi-Camera AI Podcast Video Editor
### 原生優化支援 Intel® Core™ / Intel® Arc™ / Windows x64 架構

PodFlow Pro 是一套現代、極簡且具備高質感的獨立桌面多機位 Podcast AI 自動化剪輯軟體（媲美 Filmora 與 Descript）。本版本已針對 **Intel x86_64 架構** 進行深度重構與最佳化，解決先前 ARM 架構無法在 Intel 電腦上建置、路徑無法讀取、命令列溢位與缺乏硬體加速的問題。

---

## 🚀 Intel 架構重構與核心修復亮點

1. **Intel Quick Sync Video (QSV) 瀑布式硬體編碼加速**：
   - 優先啟用 Intel CPU 內顯 (UHD / Iris Xe) 與 Intel Arc 獨立顯卡專屬硬體編碼器 (`h264_qsv`)。
   - 具備自動容錯瀑布降級：`Intel QSV` ➔ `Windows Media Foundation (h264_mf)` ➔ `NVIDIA NVENC (h264_nvenc)` ➔ `Intel AVX2/AVX-512 CPU 多核心軟體編碼 (libx264)`。
2. **修復本地檔案無法讀取重大 Bug (Native File Dialog & Asset Protocol)**：
   - 原先程式使用瀏覽器 HTML `<input type="file">`，僅能取得瀏覽器記憶體暫存的 `blob:` 虛擬網址與單純檔名，導致後端 FFmpeg 與 Python 找不到實體路徑而必定崩潰。
   - 現已全面改接 Tauri v2 原生系統對話框 (`@tauri-apps/plugin-dialog`) 與 `convertFileSrc` 串流協議，能直接讀取 Windows 本地硬碟任意磁區（如 `D:\Recordings\cam_a.mp4`）並提供流暢即時預覽。
3. **修復 32KB Windows 命令列溢位保護 (-filter_complex_script)**：
   - 修正原先程式碼將長濾鏡字串直接塞入命令列引數的嚴重問題。
   - 完整落實將多機位拼接腳本寫入獨立暫存檔，並透過 `-filter_complex_script` 引導 FFmpeg 執行，徹底解決超過 80 個剪輯點引發的 Win32 API 32,767 字元長度限制當機。
4. **彈性多機位動態對齊與音訊對齊引擎升級**：
   - 支援 1 軌、2 軌或 3 軌彈性輸入，無指派的鏡頭不會導致空參數崩潰。
   - `audio_align.py` 升級支援 Intel oneAPI MKL / AVX2 加速之 FFT 正規化交叉互相關演算法（Normalized Cross-Correlation），自動計算毫秒級音軌偏移。
5. **支援自選輸出路徑**：
   - 點擊「導出影片」自動跳出 Windows 原生儲存檔案視窗，不再強制寫入不存在的 `C:\Users\Podcast` 目錄。

---

## 🛠️ Intel CPU (Windows x64) 開發環境安裝指南

要在一台搭載 Intel CPU 的 Windows 電腦上開發與編譯此專案，請依照以下 6 個步驟配置開發環境：

### 第一步：安裝 Visual Studio 2022 C++ 建置工具 (MSVC x64)
Tauri 的 Rust 後端需要微軟的 C++ 編譯器與 Windows SDK：
1. 下載並安裝 [Visual Studio Community 2022](https://visualstudio.microsoft.com/zh-hant/vs/) 或 **Visual Studio Build Tools**。
2. 在安裝工作負載畫面中，勾選 **「使用 C++ 的桌面開發」(Desktop development with C++)**。
3. 右側詳細資訊請確保勾選：
   - `MSVC v143 - VS 2022 C++ x64/x86 建置工具 (最新)`
   - `Windows 11 SDK` (或 Windows 10 SDK)
   - `C++ CMake 工具 (選用)`
4. 點擊安裝並等待完成。

### 第二步：安裝 Rust 工具鏈 (x86_64-pc-windows-msvc)
1. 前往 [rustup.rs](https://rustup.rs/) 下載 `rustup-init.exe`。
2. 執行安裝時選擇預設選項 `1) Proceed with installation (default)`。
3. 安裝完成後，開啟 PowerShell 驗證並確保架構為 x86_64：
   ```powershell
   rustc --version
   cargo --version
   rustup default stable-x86_64-pc-windows-msvc
   ```

### 第三步：安裝 Node.js (x64)
1. 前往 [Node.js 官方網站](https://nodejs.org/) 下載 **LTS 版本** (建議 v20.x 或 v18.x 64-bit Windows Installer)。
2. 依引導完成安裝，在 PowerShell 驗證：
   ```powershell
   node -v
   npm -v
   ```

### 第四步：安裝 FFmpeg for Windows x64 (具備 Intel QSV 支援)
專案核心的影片處理、多機位拼接與波形擷取依賴 FFmpeg：
1. 前往 [Gyan.dev FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/) 或 [BtbN GitHub Releases](https://github.com/BtbN/FFmpeg-Builds/releases)。
2. 下載 `ffmpeg-release-full.7z` (內建 `h264_qsv` 與 `libx264` 編碼器支援)。
3. 解壓縮至電腦固定路徑（例如：`C:\ffmpeg`）。
4. 將 `C:\ffmpeg\bin` 加入 Windows **系統環境變數** 的 `Path` 中。
5. 重新開啟 PowerShell，驗證 FFmpeg 及 Intel QSV 編碼器：
   ```powershell
   ffmpeg -version
   ffmpeg -encoders | Select-String "qsv"
   ```
   若看到 `h264_qsv`，即代表 Intel 晶片硬體編碼器支援就緒！

### 第五步：安裝 Python 3.10+ (x64) 與音訊對齊函式庫
專案使用 Python 進行快速傅立葉轉換 (FFT) 交叉相關音訊對齊：
1. 下載並安裝 [Python 3.10+ (64-bit)](https://www.python.org/downloads/)。
   > **注意**：安裝時請務必勾選 **「Add python.exe to PATH」**。
2. 安裝 Intel AVX2 / MKL 最佳化之科學運算套件：
   ```powershell
   pip install numpy scipy
   ```
3. 驗證 Python 音訊對齊環境：
   ```powershell
   python audio_align.py --info
   ```
   終端會顯示平台架構與 `AVX2 / MKL enabled` 狀態。

---

## 💻 專案啟動與編譯指令

進入專案目錄：
```powershell
cd podflow-multicam-core
```

### 1. 安裝前端依賴
```powershell
npm install
```

### 2. 啟動桌面端開發除錯模式 (Tauri v2 Dev Mode)
```powershell
npm run tauri dev
```
- 此指令會同時啟動 Vite 前端熱重載伺服器，並以 Cargo 編譯 Rust 後端，自動開啟具備原生視窗與系統 API 權限的桌面應用程式。

### 3. (選用) 純前端瀏覽器模擬模式 (Browser Preview Mode)
```powershell
npm run dev
```
- 可透過 Chrome 或 Edge 連線至 `http://localhost:5173` 進行 UI 佈局調整，系統會自動切換為 Mock 模擬模式。

### 4. 編譯輸出 Intel x64 正式發行安裝檔 (Production Build)
```powershell
npm run tauri build
```
編譯完成後，產物將產生於：
- **NSIS 單一執行檔安裝包**：`src-tauri/target/release/bundle/nsis/PodFlow AI Studio_0.1.0_x64-setup.exe`
- **MSI 企業級安裝包**：`src-tauri/target/release/bundle/msi/PodFlow AI Studio_0.1.0_x64_zh-TW.msi`

---

## 📊 ARM 與 Intel 架構主要差異與調整對照

| 比較項目 | 原版 (Windows on ARM) | 重構後 (Intel x86_64) |
| :--- | :--- | :--- |
| **Rust Target 架構** | `aarch64-pc-windows-msvc` | `x86_64-pc-windows-msvc` (原生 Intel x64) |
| **硬體編碼加速引擎** | 依賴 Snapdragon NPU / Media Foundation | **Intel Quick Sync Video (h264_qsv)** + 瀑布降級容錯 |
| **CPU SIMD 指令集** | ARM NEON | **Intel AVX2 / AVX-512 / FMA / SSE4.2** |
| **音訊 FFT 交叉相關** | 通用演算法 | **Intel oneAPI MKL (SciPy FFTConvolve)** 秒級計算 |
| **本機檔案載入** | Web `<input>` 虛擬檔名 (易失敗) | **Tauri 原生 Dialog + Asset 串流** (支援全硬碟路徑) |
| **命令列溢位防護** | 僅註解未實裝 (CLI 易超出 32KB) | **實體 `-filter_complex_script` 外部腳本管線** |
| **輸出儲存路徑** | 強制寫死 `C:\Users\Podcast` | **自選輸出資料夾與檔名，自動防呆建目錄** |
