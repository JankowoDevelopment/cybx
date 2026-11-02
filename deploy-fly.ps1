# Skrypt automatycznego wdrozenia na Fly.io
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " DEADLOCK ZOMBIES - DEPLOYMENT NA FLY.IO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Sprawdzenie logowania
$flyCheck = fly auth whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Logowanie do Fly.io..." -ForegroundColor Yellow
    fly auth login
} else {
    Write-Host "[+] Zalogowano jako: $flyCheck" -ForegroundColor Green
}

Write-Host "[+] Budowanie projektu..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[x] Blad budowania projektu!" -ForegroundColor Red
    exit 1
}

Write-Host "[+] Uruchamianie fly deploy..." -ForegroundColor Green
fly deploy --depot=false --ha=false

Write-Host "[OK] Sukces! Twoja gra dziala na Fly.io!" -ForegroundColor Green
fly status
