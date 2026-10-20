# PodFlow Pro - Windows on ARM (ARM64) 完整相容與配置指南

本專案【路線 B】引擎（auto_director.py 與 webui.py）採用通用 Python + FFmpeg 架構，100% 原生支援 Windows on ARM（包括搭載 高通 Snapdragon X Elite / Snapdragon X Plus 的 Copilot+ PC、Surface Pro 11、Surface Laptop 7 等）。

## 🚀 為什麼可以在 ARM on Windows 上完美運行？

1. Python 原生支援 (win_arm64)：
   - Python 官方提供原生 Windows ARM64 安裝檔。
   - NumPy, SciPy, OpenCV 在 PyPI 上皆有官方 win_arm64 原生 wheels，直接 pip install 即可發揮最高硬體效能。
   - 即使安裝 x64 版 Python，Windows 11 on ARM 內建微軟 Prism 模擬器亦能以極高效率無縫運行。

2. 高通 Adreno GPU 硬體加速轉碼 (h264_mf)：
   - 在 auto_director.py 的瀑布式轉碼鏈中，偵測不到 Intel 核心顯卡時，會自動切換至微軟原生 Windows Media Foundation (h264_mf)！
   - h264_mf 會直接驅動高通 Snapdragon 晶片內的 Qualcomm Adreno GPU 與多媒體引擎進行高速硬體編碼，轉碼速度快且極度省電。

## 🛠️ ARM on Windows 快速環境安裝步驟

1. 安裝 Python for ARM64：前往 Python 官網下載 Windows installer (ARM64) 並安裝（務必勾選 Add to PATH）。
   執行：pip install numpy scipy opencv-python

2. 安裝 FFmpeg for ARM64：前往 BtbN 或 Gyan.dev 下載 winarm64 版本，解壓後將 bin 加入系統 PATH。

3. 一鍵啟動剪輯：雙擊執行 start_webui.bat 即可開啟網頁控制台！
