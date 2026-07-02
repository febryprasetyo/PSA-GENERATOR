@echo off
chcp 65001 >nul
echo 🚀 PSA Oxygen Generator Deployment Script
echo Select deployment method:
echo 1) PM2 (Node.js ^& PM2 required)
echo 2) Docker (Docker ^& Docker Compose required)
set /p choice="Enter choice (1 or 2): "

if not exist ".env" (
    echo ⚠️ .env file not found! Copying from .env.example...
    copy .env.example .env
    echo ❌ Please edit .env with your actual credentials and run this script again.
    exit /b 1
)

if "%choice%"=="1" (
    echo 📦 Deploying via PM2...
    
    echo Installing dependencies...
    call pnpm install
    
    echo Building Next.js application...
    call pnpm run build
    
    echo Running database migrations...
    call pnpm run db:push
    echo Seeding database...
    call pnpm run db:seed
    
    echo Starting PM2 processes...
    call pm2 start ecosystem.config.js
    call pm2 save
    
    echo ✅ PM2 deployment complete!
) else if "%choice%"=="2" (
    echo 🐳 Deploying via Docker Compose...
    
    docker compose -f docker-compose.prod.yml up -d --build
    
    echo ✅ Docker deployment complete!
) else (
    echo ❌ Invalid choice. Exiting.
    exit /b 1
)
pause
