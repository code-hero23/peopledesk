const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        console.log('--- Verifying WalkinEntry Schema ---');
        // This will throw if the column doesn't exist when we try to query it
        const entry = await prisma.walkinEntry.findFirst({
            select: {
                id: true,
                creName: true
            }
        });
        console.log('Success: creName field is accessible in Prisma.');
        console.log('Sample Data (if any):', entry);
    } catch (err) {
        console.error('Verification FAILED:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
