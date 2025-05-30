# 获取当前目录及所有子目录下的 .mobi 文件
$mobiFiles = Get-ChildItem -Path . -Filter "*.mobi" -Recurse

foreach ($file in $mobiFiles) {
    $cbzFile = Join-Path $file.DirectoryName ($file.BaseName + ".cbz")

    # 用 -LiteralPath 而不是 -Path
    if (Test-Path -LiteralPath $cbzFile) {
        Write-Host "跳过: $($file.FullName)，同名CBZ已存在。"
    } else {
        Write-Host "正在处理: $($file.FullName)"
        # 调用 Python 脚本处理
        python .\MOBI格式漫画转CBZ.py "$($file.FullName)"
    }
}

Write-Host "`n所有任务已完成。按任意键退出..."
Pause