param(
  [string]$VersionFile = '.\backend\src\main\resources\static\version.txt'
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
Write-Output $newVersion
