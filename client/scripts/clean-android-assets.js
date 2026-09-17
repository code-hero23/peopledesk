import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const androidAssetsDir = path.resolve(__dirname, '../android/app/src/main/assets/public');

const heavyFilesToExclude = [
  'bh-meeting-break.gif',
  'client-meeting-break.gif',
  'lunch-break.gif',
  'tea-break.gif',
  'salute.gif',
  'app-debug.apk'
];

if (fs.existsSync(androidAssetsDir)) {
  heavyFilesToExclude.forEach((file) => {
    const fullPath = path.join(androidAssetsDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`[clean-android-assets] Excluded heavy file from Android APK: ${file}`);
      } catch (err) {
        console.warn(`[clean-android-assets] Could not remove ${file}:`, err.message);
      }
    }
  });
}
