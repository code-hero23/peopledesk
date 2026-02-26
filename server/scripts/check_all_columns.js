
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log("--- Comprehensive Schema Audit ---");

        const tables = ['user', 'attendance', 'workLog', 'project', 'leaveRequest', 'permissionRequest'];

        for (const table of tables) {
            try {
                const record = await prisma[table].findFirst();
                console.log(`\nTable [${table}] columns:`);
                if (record) {
                    console.log(Object.keys(record).join(', '));
                } else {
                    console.log("(No records to inspect)");
                }
            } catch (e) {
                console.log(`Error inspecting ${table}:`, e.message);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
