@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
title PodFlow Pro - 本機 AI 導播 WebUI
echo ========================================================
echo   PodFlow Pro - 本機 AI 多機位智慧導播控制台 (WebUI)
echo ========================================================
echo 正在啟動本機伺服器並開啟瀏覽器...
python webui.py
pause
