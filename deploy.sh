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
# prisma migrate deploy is safe for existing data (it doesn't reset)
npx prisma migrate deploy 
node scripts/safe_update.js
pm2 restart all
cd ..

echo "🎨 Building Frontend..."
cd client
npm install
npm run build

echo "📱 Building Mobile APK..."
# Sync web assets to Capacitor
npx cap sync android

# Build the Android APK using Gradle
cd android
chmod +x ./gradlew || true
bash ./gradlew assembleDebug

# Move APK to a public web path for easy download if needed
mkdir -p ../../server/uploads/apks/
cp app/build/outputs/apk/debug/app-debug.apk ../../server/uploads/apks/peopledesk-latest-v1.0.2.apk

cd ../..

echo "✅ Deployment & APK Build Complete!"
echo "📍 APK Location: client/android/app/build/outputs/apk/debug/app-debug.apk"
