$url = Read-Host "请输入Steam创意工坊网址"

# 提取文件ID
if ($url -match "id=(\d+)") {
    $fileId = $matches[1]
} else {
    Write-Host " 无法解析文件ID，请检查输入的链接。" -ForegroundColor Red
    exit
}

# 获取网页源码，解析AppID
try {
    $html = Invoke-WebRequest -Uri $url -UseBasicParsing
    if ($html.Content -match "data-appid=`"(\d+)`"") {
        $appId = $matches[1]
    } else {
        Write-Host " 未能自动解析AppID，请手动输入。" -ForegroundColor Yellow
        $appId = Read-Host "请输入游戏的AppID"
    }
}
catch {
    Write-Host " 无法访问Steam网页，请检查网络或代理。" -ForegroundColor Red
    exit
}

# 输入Steam账号
$steamUser = Read-Host "请输入Steam账号"
$steamPass = Read-Host "请输入Steam密码" -AsSecureString
$plainPass = [System.Net.NetworkCredential]::new("", $steamPass).Password

# 拼接命令
$cmd = "workshop_download_item $appId $fileId"

Write-Host "`n 已解析到：" -ForegroundColor Green
Write-Host "AppID  = $appId"
Write-Host "FileID = $fileId"
Write-Host "执行命令 = $cmd`n" -ForegroundColor Yellow

# 调用SteamCMD
try {
    & steamcmd.exe +login $steamUser $plainPass +$cmd +quit
}
catch {
    Write-Host " 未找到steamcmd.exe，请确认已安装并在PATH或当前目录。" -ForegroundColor Red
    exit
}