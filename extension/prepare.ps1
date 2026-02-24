# Script de chuan bi files cho Firefox Sidebar Extension
# Chay script nay truoc khi load extension vao Firefox

$ErrorActionPreference = "Stop"

$ExtensionDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Preparing Firefox Sidebar extension files..." -ForegroundColor Green

# Copy manifest-firefox.json thanh manifest.json
Copy-Item "$ExtensionDir\manifest-firefox.json" "$ExtensionDir\manifest.json" -Force
Write-Host "  Copied manifest-firefox.json to manifest.json" -ForegroundColor Cyan

Write-Host "`nFirefox Sidebar extension files ready!" -ForegroundColor Green
Write-Host "`nDe cai dat vao Firefox:" -ForegroundColor Yellow
Write-Host "1. Mo Firefox, vao: about:debugging#/runtime/this-firefox" -ForegroundColor White
Write-Host "2. Click 'This Firefox' o menu trai" -ForegroundColor White
Write-Host "3. Click 'Load Temporary Add-on'" -ForegroundColor White
Write-Host "4. Chon file manifest.json trong folder extension" -ForegroundColor White
Write-Host "`nSu dung Sidebar:" -ForegroundColor Yellow
Write-Host "- Click icon extension tren toolbar" -ForegroundColor White
Write-Host "- Chon 'Open in Sidebar' de mo sidebar" -ForegroundColor White
Write-Host "- Sidebar hien thi song song voi trang web" -ForegroundColor White
Write-Host "`nLuu y: Can load lai moi lan mo Firefox (temporary addon)" -ForegroundColor Red
