$ErrorActionPreference = "Stop"

Write-Host "Building Nextract Python server..."

Set-Location $PSScriptRoot

uv add --dev pyinstaller
uv run pyinstaller nextract-server.spec --clean --noconfirm

$target = "x86_64-pc-windows-msvc"
$binaryDir = "..\src-tauri\binaries"

New-Item -ItemType Directory -Force -Path $binaryDir | Out-Null

Copy-Item -Force "dist\nextract-server.exe" "$binaryDir\nextract-server-$target.exe"

Write-Host "Done. Binary at: $binaryDir\nextract-server-$target.exe"
