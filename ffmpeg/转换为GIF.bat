@echo off
:: 设置终端为 UTF-8
chcp 65001 >nul

:: 检查是否拖放了文件
if "%~1"=="" (
    echo 请将视频文件拖放到此脚本上！
    pause
    exit /b
)

:: 配置参数（可根据需求修改）
set "FPS=10"                :: 帧率
set "WIDTH=630"              :: GIF宽度，高度按比例缩放
set "MAX_COLORS=24"         :: 调色板颜色数
set "DITHER=bayer"           :: 抖动算法: none/bayer/floyd_steinberg
set "BAYER_SCALE=1"          :: bayer抖动强度
set "TRANSPARENT=1"           :: 透明支持：1=保留透明, 0=不保留

:: 输入输出文件
set "input_file=%~1"
set "output_file=%~dpn1.gif"
set "palette_file=%~dpn1_palette.png"

:: 生成调色板（优化调色板 + 支持透明）
ffmpeg -y -i "%input_file%" -vf "fps=%FPS%,scale=%WIDTH%:-1:flags=lanczos,palettegen=reserve_transparent=%TRANSPARENT%:max_colors=%MAX_COLORS%" "%palette_file%"

:: 使用调色板生成高质量 GIF（抖动 + 透明优化）
ffmpeg -i "%input_file%" -i "%palette_file%" -filter_complex "fps=%FPS%,scale=%WIDTH%:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=%DITHER%:bayer_scale=%BAYER_SCALE%" -plays 0 "%output_file%"

:: 完成提示
echo 已保存为 %output_file%

:: 删除临时调色板文件
del "%palette_file%"
pause