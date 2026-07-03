#!/bin/bash
# deploy.sh - All-in-one deployment script for PSA Monitoring Dashboard

echo "🚀 PSA Oxygen Generator Deployment Script"
echo "Select deployment method:"
echo "1) PM2 (Node.js & PM2 required)"
echo "2) Docker (Docker & Docker Compose required)"
read -p "Enter choice (1 or 2): " choice

# Check .env
if [ ! -f .env ]; then
  echo "⚠️ .env file not found! Copying from .env.example..."
  cp .env.example .env
  echo "❌ Please edit .env with your actual credentials and run this script again."
  exit 1
fi

if [ "$choice" == "1" ]; then
  echo "📦 Deploying via PM2..."
  
  # Git Pull
  echo "Git Pulling..." 
  git pull origin main

  # Install dependencies
  echo "Installing dependencies..."
  pnpm install

  # Build Next.js
  echo "Building Next.js application..."
  pnpm run build

  # Database Migrations & Seeding
  echo "Running database migrations..."
  pnpm run db:push
  echo "Seeding database..."
  pnpm run db:seed

  # Start via PM2
  echo "Starting PM2 processes..."
  pm2 start ecosystem.config.js
  pm2 save
  
  echo "✅ PM2 deployment complete!"

elif [ "$choice" == "2" ]; then
  echo "🐳 Deploying via Docker Compose..."

  # Start Docker
  docker compose -f docker-compose.prod.yml up -d --build

  echo "✅ Docker deployment complete!"
  
else
  echo "❌ Invalid choice. Exiting."
  exit 1
fi
