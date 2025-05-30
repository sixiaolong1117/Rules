@echo off
:: 检查是否拖放了文件
if "%~1"=="" (
    echo 请将视频文件拖放到此脚本上！
    pause
    exit /b
)

:: 设置输入文件路径和输出文件路径
set "input_file=%~1"
set "output_file=%~dpn1_265.mp4"

:: 使用FFmpeg命令，使用x265编码器，设置多线程
ffmpeg -i "%input_file%" -c:v hevc_nvenc -preset slow -rc:v vbr_hq -cq 22 -c:a copy "%output_file%"

:: 完成提示
echo 保存为 %output_file%
pause
