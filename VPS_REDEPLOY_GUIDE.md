# VPS Redeployment Guide

Follow these steps to update your live application on the VPS.

## 1. Connect to VPS
Open your terminal and SSH into your server:
```bash
ssh deploy@<your-vps-ip>
```

## 2. Navigate to Project Directory
```bash
cd ~/people-desk  # or whatever your folder is named
```

## 3. Pull Latest Changes
```bash
git pull origin main
```
*If you have local changes on the server that conflict, you might need to run `git reset --hard origin/main` (WARNING: this deletes local server changes).*

## 4. Update Backend (Server)
Navigate to the server folder and update dependencies + database.

```bash
cd server
npm install
npx prisma generate
# CRITICAL: Use 'deploy' not 'dev' to preserve data
npx prisma migrate deploy
```

Restart the backend process (assuming you use PM2):
```bash
pm2 restart server  # or 'api' or whatever ID your process has
```
*To check status: `pm2 status`*

## 5. Update Frontend (Client)
Navigate to the client folder and rebuild the assets.

```bash
cd ../client
npm install
npm run build
```

The `dist` folder is now updated. Nginx should already be pointing to this folder, so **no restart is usually needed** for the frontend unless you need to reload Nginx config.

If you are caching heavily, you might want to:
```bash
sudo systemctl reload nginx
```

---

## ⚡ Quick Redeploy Script (Optional)

You can create a script `redeploy.sh` in your project root on the VPS to do all this in one command.

**Create the file:**
```bash
nano ~/people-desk/redeploy.sh
```

**Paste this content:**
```bash
#!/bin/bash

echo "🚀 Starting Redeploy..."

# 1. Pull Code
echo "📥 Pulling latest code..."
git pull

# 2. Server
echo "🛠️ Updating Server..."
cd server
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart server
cd ..

# 3. Client
echo "🎨 Building Client..."
cd client
npm install
npm run build
cd ..

echo "✅ Deployment Complete!"
```

**Make it executable:**
```bash
chmod +x ~/people-desk/redeploy.sh
```

**Run it next time:**
```bash
./redeploy.sh
```
