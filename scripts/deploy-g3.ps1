$ErrorActionPreference = 'Stop'

Write-Host 'Iniciando deploy do G3...' -ForegroundColor Cyan

if (!(Test-Path -Path ".\docker\cloudflared\config.yml")) {
  Write-Error 'Arquivo docker/cloudflared/config.yml nao encontrado.'
  exit 1
}

$novaVersao = & .\scripts\bump-version.ps1
Write-Host "Versao definida para $novaVersao" -ForegroundColor Yellow

Write-Host 'Subindo stack via docker compose...' -ForegroundColor Cyan

$composeCommand = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
  try {
    docker compose version | Out-Null
    $composeCommand = 'docker compose'
  } catch {
    $composeCommand = $null
  }
}

if (-not $composeCommand -and (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
  $composeCommand = 'docker-compose'
}

if (-not $composeCommand) {
  Write-Error 'Docker Compose nao encontrado.'
  exit 1
}

Invoke-Expression "$composeCommand down"
Invoke-Expression "$composeCommand up -d --build"

Write-Host 'Deploy finalizado.' -ForegroundColor Green
