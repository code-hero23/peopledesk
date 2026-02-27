#!/bin/bash
# 🚀 One-Click Redeploy Script for PeopleDesk

echo "📥 Updating code..."
git pull origin main

echo "🛠️ Updating Server & Database..."
cd server
npm install
npx prisma generate
npx prisma db push --accept-data-loss
pm2 restart all
cd ..

echo "🎨 Building Frontend..."
cd client
npm install
npm run build
cd ..

echo "✅ Redeploy Complete! Refresh your browser."
