# EvenPass - Script de Inicio Rápido
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EVENPASS - PLATAFORMA SAAS DE GESTIÓN DE EVENTOS & QR   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Iniciar Backend (Spring Boot 3 + PostgreSQL/H2 en puerto 8080)" -ForegroundColor Yellow
Write-Host "2. Iniciar Frontend (Angular Dev Server en puerto 4200)" -ForegroundColor Yellow
Write-Host "3. Abrir Plataforma en Navegador (Build listo para usar)" -ForegroundColor Yellow
Write-Host "4. Abrir Landing Page de EvenPass" -ForegroundColor Yellow
Write-Host "5. Salir" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Selecciona una opción (1-5)"

switch ($choice) {
    "1" {
        Write-Host "Iniciando Spring Boot Backend..." -ForegroundColor Green
        Set-Location "$PSScriptRoot\evenpass-backend"
        mvn spring-boot:run
    }
    "2" {
        Write-Host "Iniciando Angular Frontend..." -ForegroundColor Green
        Set-Location "$PSScriptRoot\evenpass-frontend"
        npm start
    }
    "3" {
        Write-Host "Abriendo Plataforma EvenPass SaaS..." -ForegroundColor Green
        Start-Process "$PSScriptRoot\evenpass-frontend\dist\evenpass-frontend\browser\index.html"
    }
    "4" {
        Write-Host "Abriendo Landing Page de EvenPass..." -ForegroundColor Green
        Start-Process "$PSScriptRoot\landing\index.html"
    }
    Default {
        Write-Host "Operación cancelada." -ForegroundColor Gray
    }
}
