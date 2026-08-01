param(
  [string]$VersionFile = '.\updates\version.txt'
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path -Path $VersionFile)) {
  throw "Arquivo de versao nao encontrado: $VersionFile"
}

$version = (Get-Content -Path $VersionFile -TotalCount 1).Trim()

if ($version -notmatch '^\d+\.\d+\.\d+$') {
  throw "Formato de versao invalido: $version"
}

$parts = $version.Split('.')
$majorWidth = $parts[0].Length
$minorWidth = $parts[1].Length
$patchWidth = $parts[2].Length

$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2] + 1

$newVersion = '{0}.{1}.{2}' -f `
  $major.ToString("D$majorWidth"), `
  $minor.ToString("D$minorWidth"), `
  $patch.ToString("D$patchWidth")

Set-Content -Path $VersionFile -Value $newVersion -Encoding UTF8

foreach ($jsonPath in @('.\updates\version.json', '.\backend\updates\version.json')) {
  if (Test-Path -Path $jsonPath) {
    $manifest = Get-Content -Path $jsonPath -Raw | ConvertFrom-Json
    $manifest.latestVersion = $newVersion
    $manifest.minCompatibleVersion = $newVersion
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8
  }
}

$appVersionPath = '.\frontend\src\lib\app-version.ts'
if (Test-Path -Path $appVersionPath) {
  $content = Get-Content -Path $appVersionPath -Raw
  $content = $content -replace '(\|\|\s*__APP_VERSION__\s*\|\|\s*")[^"]+(")', "`${1}$newVersion`${2}"
  Set-Content -Path $appVersionPath -Value $content -Encoding UTF8
}

Write-Output $newVersion
