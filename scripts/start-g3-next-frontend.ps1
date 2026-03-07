Set-Location "$PSScriptRoot\..\frontend"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example.react" ".env"
}

npm install
npm run react:dev
