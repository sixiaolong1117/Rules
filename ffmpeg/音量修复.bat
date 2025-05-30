@echo off
:: 检查是否拖放了文件
if "%~1"=="" (
    echo 请将视频文件拖放到此脚本上！
    pause
    exit /b
)

:: 设置输入文件路径和输出文件路径
set "input_file=%~1"
set "output_file=%~dpn1_AudioFix.mp4"

:: 分析音频并自动调节音量到适合的水平
ffmpeg -i "%input_file%" -af "loudnorm" -map_metadata 0 -movflags use_metadata_tags -vcodec copy "%output_file%"

:: 完成提示
echo 视频已成功逆时针旋转 90 度，保存为 %output_file%
pause
