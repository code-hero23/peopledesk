const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function exportData() {
  console.log("🚀 Starting database export via Prisma...");
  
  // Get all models defined in the Prisma Client
  const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  const backup = {};

  for (const model of models) {
    try {
      console.log(`📦 Exporting table: ${model}...`);
      const data = await prisma[model].findMany();
      backup[model] = data;
    } catch (error) {
      console.error(`⚠️ Failed to export model ${model}:`, error.message);
    }
  }

  const outputPath = path.join(__dirname, 'db_backup.json');
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
  console.log(`\n✅ Export complete! Backup saved to:\n👉 ${outputPath}`);
  await prisma.$disconnect();
}

exportData().catch(e => {
  console.error("❌ Export failed:", e);
  process.exit(1);
});
