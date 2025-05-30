@echo off
chcp 65001 >nul
:: 使用说明：
:: 把图片（PNG/JPG/透明PNG）拖到此bat文件上
:: 会生成白底16:9 WebP（无损、图片居中、带留白）

if "%~1"=="" (
    echo 请拖动图片到此bat文件上！
    pause
    exit /b
)

setlocal enabledelayedexpansion

set "input=%~1"
set "dir=%~dp1"
set "name=%~n1"
set "output=%dir%%name%_16x9.webp"

:: 输出画布大小
set "width=1280"
set "height=720"

:: 图片占画布比例
set "scale_factor=0.7"

echo 处理中：%input%

:: ffmpeg：创建白色背景、叠加前景、输出无损webp
ffmpeg -y -i "%input%" -lavfi "color=white:s=%width%x%height%[bg];[0]scale='if(gt(a,%width%/%height%),%width%*%scale_factor%,-1)':'if(gt(a,%width%/%height%),-1,%height%*%scale_factor%)'[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2:format=auto" -frames:v 1 -lossless 1 "%output%"

echo.
echo ✅ 已生成无损WebP：
echo %output%
pause