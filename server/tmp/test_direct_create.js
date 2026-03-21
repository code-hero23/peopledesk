const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreateVoucher() {
    try {
        console.log("Attempting to create a voucher with minimal required data...");
        const result = await prisma.voucher.create({
            data: {
                userId: 1, // Assuming user 1 exists
                type: 'ADVANCE',
                amount: 1000,
                purpose: 'Test Advance Cash',
                date: new Date(),
                status: 'PENDING',
                cooStatus: 'PENDING',
                amStatus: 'PENDING'
            }
        });
        console.log("Voucher created successfully:", result);
    } catch (error) {
        console.error("ERROR in creating voucher:", error);
        if (error.code) console.error("Prisma Error Code:", error.code);
        if (error.meta) console.error("Prisma Error Meta:", error.meta);
    } finally {
        await prisma.$disconnect();
    }
}

testCreateVoucher();
