Set-Location "$PSScriptRoot\..\backend"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example.node" ".env"
}

npm install
npm run prisma:generate
npm run dev:seed-admin
npm run dev
