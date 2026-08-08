#!/bin/bash
# 🚀 Comprehensive Deployment Script for PeopleDesk

# Ensure script stops on error
set -e

echo "📥 Updating code from GitHub..."
git pull origin main

echo "🛠️ Updating Server..."
cd server
npm install
npx prisma generate
# Attempt prisma migrate deploy safely (fallback to safe_update.js if no pending migrations)
npx prisma migrate deploy || echo "⚠️ Prisma migrate deploy skipped/handled, running safe_update.js..."
node scripts/safe_update.js
pm2 restart all || pm2 start src/app.js --name "peopledesk-backend"
cd ..

echo "🎨 Building Frontend..."
cd client
npm install
npm run build

echo "📱 Checking Mobile APK Build (Optional)..."
if [ -d "android" ] && command -v java &> /dev/null; then
    echo "Syncing Capacitor Android..."
    npx cap sync android || true
    cd android
    chmod +x ./gradlew || true
    ./gradlew assembleDebug || true
    mkdir -p ../../server/uploads/apks/
    cp app/build/outputs/apk/debug/app-debug.apk ../../server/uploads/apks/test-1peopledesk-latest-v1.0.3.apk || true
    cd ../..
    echo "📍 APK Location: server/uploads/apks/test-1peopledesk-latest-v1.0.3.apk"
else
    cd ..
    echo "ℹ️ Android SDK/Java not found on VPS - Web & Server deployment complete!"
fi

echo "✅ Deployment Complete!"