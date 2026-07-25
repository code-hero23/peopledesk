#!/bin/bash
# Comprehensive Deployment Script for PeopleDesk

set -e

echo "Updating code from GitHub..."
git pull --rebase origin main

echo "Updating Server..."
cd server
npm install
npx prisma generate
npx prisma migrate deploy
node scripts/safe_update.js
pm2 restart all
cd ..

echo "Building Frontend..."
cd client
npm install
npm run build

echo "Building Mobile APK..."
npx cap sync android

cd android
chmod +x gradlew
./gradlew assembleDebug

mkdir -p ../../server/uploads/apks/
cp app/build/outputs/apk/debug/app-debug.apk ../../server/uploads/apks/peopledesk-latest.apk

cd ../..

echo "Deployment and APK build complete!"
echo "APK Location: client/android/app/build/outputs/apk/debug/app-debug.apk"