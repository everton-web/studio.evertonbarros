# Instala e sobe a plataforma e o scraper do Google Maps no Windows.
# Uso (PowerShell, na pasta onde o script está):
#   powershell -ExecutionPolicy Bypass -File .\instalar-windows.ps1
# Pré-requisitos: Git, Node.js 20.9+ e Docker Desktop abertos.

param(
  [string]$Base = "D:\studio"
)

$ErrorActionPreference = "Stop"
$plataforma = Join-Path $Base "app-evertonbrito"
$scraper = Join-Path $Base "google-maps-scraper-kit"

New-Item -ItemType Directory -Force -Path $Base | Out-Null

# 1. Clonar (ou atualizar) os dois repositórios
if (-not (Test-Path (Join-Path $plataforma ".git"))) {
  git clone https://github.com/everton-web/app-evertonbrito $plataforma
}
git -C $plataforma fetch origin feat/prospeccao-gmaps-ux
git -C $plataforma checkout feat/prospeccao-gmaps-ux
git -C $plataforma pull --ff-only

if (-not (Test-Path (Join-Path $scraper ".git"))) {
  git clone https://github.com/vzbaggio/google-maps-scraper-kit $scraper
}

# 2. Dependências da plataforma
Push-Location $plataforma
npm install
Pop-Location

# 3. Configuração (.env.local): só pergunta o que falta
$envFile = Join-Path $plataforma ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Host ""
  Write-Host "Configuração inicial. Pressione Enter para pular o que não tiver agora." -ForegroundColor Cyan
  $supaUrl = Read-Host "SUPABASE_URL"
  $supaKey = Read-Host "SUPABASE_SERVICE_ROLE_KEY"
  $senha = Read-Host "Senha para entrar na plataforma (AGENCIA_PASS)"
  if (-not $senha) { $senha = "dev" }
  $segredo = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
  @"
SUPABASE_URL=$supaUrl
SUPABASE_SERVICE_ROLE_KEY=$supaKey
SUPABASE_STORAGE_BUCKET=plataforma-arquivos
AGENCIA_USER=everton
AGENCIA_PASS=$senha
AGENCIA_SECRET=$segredo
GMAPS_SCRAPER_URL=http://localhost:8080
"@ | Set-Content -Encoding UTF8 $envFile
  Write-Host "Criado: $envFile" -ForegroundColor Green
} else {
  Write-Host "Mantendo o .env.local existente: $envFile" -ForegroundColor Yellow
}

# 4. Scraper (precisa do Docker Desktop aberto)
try {
  docker info | Out-Null
  Push-Location $scraper
  docker compose up -d
  Pop-Location
  Write-Host "Scraper no ar em http://localhost:8080" -ForegroundColor Green
} catch {
  Write-Host "Docker não está rodando. Abra o Docker Desktop e rode 'docker compose up -d' em $scraper" -ForegroundColor Red
}

# 5. Plataforma em uma janela própria
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$plataforma'; npm run dev"
Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Pronto. Entre com usuário 'everton' e a senha que você definiu." -ForegroundColor Green
