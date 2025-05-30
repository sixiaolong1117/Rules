chcp 65001
@echo off
setlocal enabledelayedexpansion

:: 检查是否拖入文件
if "%~1"=="" (
    echo 请将 AVIF 文件拖放到本脚本上运行。
    pause
    exit
)

:: 遍历所有拖入的文件
for %%F in (%*) do (
    set "input=%%~F"
    set "output=%%~dpnF.png"

    echo 正在转换: "!input!"
    ffmpeg -i "!input!" "!output!"

    if %errorlevel% neq 0 (
        echo 转换失败: "!input!"
    ) else (
        echo 转换成功: "!output!"
    )
)

echo 完成！
pause
