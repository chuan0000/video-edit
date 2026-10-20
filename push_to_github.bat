@echo off
chcp 65001 >nul
echo ======================================================================
echo    PodFlow Pro - 一鍵推送到個人 GitHub 倉庫小助手
echo ======================================================================
echo.
echo 請先在瀏覽器前往 https://github.com/new 建立一個新的空白 Repository。
echo.
set /p REPO_URL="請貼上您的 GitHub 倉庫網址 (例如 https://github.com/YourName/podflow.git): "

if "%REPO_URL%"=="" (
    echo [錯誤] 倉庫網址不得為空！
    pause
    exit /b 1
)

echo.
echo [1/4] 初始化本地 Git 倉庫...
git init
echo [2/4] 新增所有專案檔案...
git add .
echo [3/4] 建立首次提交 Commit...
git commit -m "feat: PodFlow Pro Route B - Multimodal AI Director (Universal ARM64 and x86_64)"
echo [4/4] 設定遠端分支並推送到 GitHub...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
git push -u origin main

echo.
echo ======================================================================
echo    🎉 程式碼已成功推送至您的 GitHub！
echo ======================================================================
pause
