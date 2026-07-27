#!/bin/bash
# deploy.sh - PM2 deployment and management script for PSA Monitoring Dashboard

set -e

echo "=========================================="
echo "🚀 PSA Oxygen Generator PM2 Manager"
echo "=========================================="

# Check .env file
check_env() {
  if [ ! -f .env ]; then
    echo "⚠️ .env file not found! Copying from .env.example..."
    cp .env.example .env
    echo "❌ Please edit .env with your actual credentials and run this script again."
    exit 1
  fi
}

# Record deployment history log
log_deployment() {
  local mode=$1
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  local commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
  local commit_msg=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "N/A")
  local user_name=$(whoami)

  echo "[$timestamp] MODE: $mode | COMMIT: $commit_hash | MSG: \"$commit_msg\" | USER: $user_name" >> deployments.log
  echo "📝 Deployment logged to deployments.log"
}

# Determine mode from command line parameter or interactive menu
MODE=$1

if [ -z "$MODE" ]; then
  echo "Pilih mode eksekusi PM2:"
  echo "1) dev     - Jalankan aplikasi dalam mode Development (Next dev & MQTT listener)"
  echo "2) deploy  - Deploy aplikasi pertama kali untuk Production (Install, Build, DB Push & PM2 Start)"
  echo "3) update  - Update aplikasi yang sudah terdeploy (Git pull, Install, Build & PM2 Reload)"
  read -p "Masukkan pilihan (1, 2, atau 3 / dev, deploy, update): " choice

  case "$choice" in
    1|dev) MODE="dev" ;;
    2|deploy) MODE="deploy" ;;
    3|update) MODE="update" ;;
    *)
      echo "❌ Pilihan tidak valid. Keluar."
      exit 1
      ;;
  esac
fi

case "$MODE" in
  dev)
    echo "🛠️ Menjalankan mode DEVELOPMENT via PM2..."
    check_env
    
    echo "📦 Installing dependencies..."
    pnpm install

    echo "🔄 Starting PM2 in dev mode..."
    # Hapus proses dev lama jika ada
    pm2 delete psa-dashboard-dev psa-mqtt-dev 2>/dev/null || true
    
    # Jalankan dev server Next.js dan MQTT listener via PM2
    pm2 start "pnpm dev" --name "psa-dashboard-dev"
    pm2 start "pnpm run mqtt" --name "psa-mqtt-dev"
    pm2 save

    echo "✅ Development server berhasil dijalankan di PM2!"
    echo "📊 Status PM2:"
    pm2 status
    ;;

  deploy)
    echo "📦 Menjalankan mode INITIAL DEPLOYMENT (Production)..."
    check_env

    echo "📦 Installing dependencies..."
    pnpm install

    echo "🏗️ Building Next.js application..."
    pnpm run build

    echo "🗄️ Running database push..."
    pnpm run db:push || true

    echo "🚀 Starting PM2 processes..."
    pm2 start ecosystem.config.js
    pm2 save

    log_deployment "DEPLOY"
    echo "✅ PM2 Initial Deployment Selesai!"
    echo "📊 Status PM2:"
    pm2 status
    ;;

  update)
    echo "🔄 Menjalankan mode UPDATE (Production)..."
    check_env

    echo "📥 Pulling latest changes from Git..."
    git pull origin $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

    echo "📦 Installing dependencies..."
    pnpm install

    echo "🏗️ Building Next.js application..."
    pnpm run build

    echo "🔄 Reloading PM2 processes..."
    pm2 reload ecosystem.config.js || pm2 restart ecosystem.config.js
    pm2 save

    log_deployment "UPDATE"
    echo "✅ PM2 Update Selesai!"
    echo "📊 Status PM2:"
    pm2 status
    ;;

  *)
    echo "❌ Mode '$MODE' tidak dikenal. Gunakan: dev, deploy, atau update."
    exit 1
    ;;
esac
