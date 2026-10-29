#!/bin/bash
# 🚀 Comprehensive Deployment Script for PeopleDesk

# Ensure script stops on error
set -e

echo "📥 Updating code from GitHub..."
# Remove any local untracked root package-lock.json to avoid blocking git pull
rm -f package-lock.json
git stash -u || true
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
if [ -d "android" ] && command -v java &> /dev/null && [ -n "$ANDROID_HOME" -o -d "$HOME/Android/Sdk" -o -f "android/local.properties" ]; then
    echo "Syncing Capacitor Android..."
    npx cap sync android || true
    cd android
    chmod +x ./gradlew || true
    
    echo "Building Release APKs (PD Call Sync & AE Manager)..."
    ./gradlew assembleRelease || true
    ./gradlew assembleDebug || true

    mkdir -p ../../server/uploads/apks/
    mkdir -p ../../server/uploads/apks/call-sync/
    
    # Call Sync APKs (Stored in subfolder server/uploads/apks/call-sync/)
    if [ -f "app/build/outputs/apk/peopledesk/release/app-peopledesk-release.apk" ]; then
        cp app/build/outputs/apk/peopledesk/release/app-peopledesk-release.apk ../../server/uploads/apks/call-sync/call-sync-latest.apk || true
        cp app/build/outputs/apk/peopledesk/release/app-peopledesk-release.apk ../../server/uploads/apks/peopledesk-release-latest.apk || true
        echo "📍 Call Sync Release APK Location: server/uploads/apks/call-sync/call-sync-latest.apk"
    elif [ -f "app/build/outputs/apk/peopledesk/debug/app-peopledesk-debug.apk" ]; then
        cp app/build/outputs/apk/peopledesk/debug/app-peopledesk-debug.apk ../../server/uploads/apks/call-sync/call-sync-latest.apk || true
        cp app/build/outputs/apk/peopledesk/debug/app-peopledesk-debug.apk ../../server/uploads/apks/peopledesk-release-latest.apk || true
        echo "📍 Call Sync Debug APK Location (Signed): server/uploads/apks/call-sync/call-sync-latest.apk"
    fi

    # AE Manager APKs (Prioritize signed release or debug APK)
    if [ -f "app/build/outputs/apk/aemanager/release/app-aemanager-release.apk" ]; then
        cp app/build/outputs/apk/aemanager/release/app-aemanager-release.apk ../../server/uploads/apks/ae-manager-latest.apk || true
        echo "📍 AE Manager Release APK Location: server/uploads/apks/ae-manager-latest.apk"
    elif [ -f "app/build/outputs/apk/aemanager/debug/app-aemanager-debug.apk" ]; then
        cp app/build/outputs/apk/aemanager/debug/app-aemanager-debug.apk ../../server/uploads/apks/ae-manager-latest.apk || true
        echo "📍 AE Manager Debug APK Location (Signed): server/uploads/apks/ae-manager-latest.apk"
    elif [ -f "app/build/outputs/apk/aemanager/release/app-aemanager-release-unsigned.apk" ]; then
        cp app/build/outputs/apk/aemanager/release/app-aemanager-release-unsigned.apk ../../server/uploads/apks/ae-manager-latest.apk || true
    fi

    cd ../..
else
    cd ..
    echo "ℹ️ Android SDK/Java environment not configured on VPS - Web & Server deployment complete!"
fi

echo "✅ Deployment Complete!"
