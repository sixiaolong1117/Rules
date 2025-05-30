@echo off
:: 检查是否拖放了文件
if "%~1"=="" (
    echo 请将视频文件拖放到此脚本上！
    pause
    exit /b
)

:: 设置输入文件路径和输出文件路径
set "input_file=%~1"
set "output_file=%~dpn1.apng"

:: 使用FFmpeg导出为APNG动图
ffmpeg -i "%input_file%" -plays 0 "%output_file%"

:: 完成提示
echo 已保存为 %output_file%
pause
