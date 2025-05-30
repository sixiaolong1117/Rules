@echo off
:: 检查是否拖放了文件
if "%~1"=="" (
    echo 请将视频文件拖放到此脚本上！
    pause
    exit /b
)

:: 设置输入文件路径和输出文件路径
set "input_file=%~1"
set "output_file=%~dpn1_rotated.mp4"

:: 使用FFmpeg命令，逆时针旋转90度，保留元数据，并使用x264编码器，设置多线程
ffmpeg -i "%input_file%" -vf "transpose=2" -c:v libx264 -crf 18 -preset slow -threads 12 -map_metadata 0 -movflags use_metadata_tags -c:a copy "%output_file%"

:: 完成提示
echo 视频已成功逆时针旋转 90 度，保存为 %output_file%
pause
