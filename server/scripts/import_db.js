const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function importData() {
  const backupPath = path.join(__dirname, 'db_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: Backup file not found at ${backupPath}`);
    process.exit(1);
  }

  console.log("🚀 Starting database import/restore via Prisma...");
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const models = Object.keys(backup);

  // Disable triggers/constraints in PostgreSQL temporarily
  console.log("🔒 Temporarily disabling database constraints...");
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

  for (const model of models) {
    const data = backup[model];
    if (!data || data.length === 0) continue;

    console.log(`📥 Importing ${data.length} records into table: ${model}...`);
    
    // Clear existing data in the table to avoid duplicate keys
    try {
      await prisma[model].deleteMany({});
    } catch (e) {
      console.log(`⚠️ Note: Failed to clear ${model}: ${e.message}`);
    }

    // Insert records
    try {
      await prisma[model].createMany({
        data: data,
        skipDuplicates: true
      });
    } catch (error) {
      console.error(`❌ Failed importing model ${model}:`, error.message);
    }
  }

  // Restore triggers/constraints
  console.log("🔓 Re-enabling database constraints...");
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

  // Reset auto-increment sequences in PostgreSQL for each table
  console.log("🔄 Resetting auto-increment sequences...");
  for (const model of models) {
    const tableName = model.charAt(0).toUpperCase() + model.slice(1);
    try {
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${tableName}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${tableName}"), 1)
        );
      `);
    } catch (e) {
      try {
        await prisma.$executeRawUnsafe(`
          SELECT setval(
            pg_get_serial_sequence('"${model}"', 'id'),
            COALESCE((SELECT MAX(id) FROM "${model}"), 1)
          );
        `);
      } catch (err) {
        // Safe to ignore if table has no serial id
      }
    }
  }

  console.log("\n✅ Import complete!");
  await prisma.$disconnect();
}

importData().catch(e => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});
