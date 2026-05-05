const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateFlow() {
    const userId = 11; // Aravindan S
    try {
        console.log('--- Step 1: Create Voucher ---');
        const newVoucher = await prisma.voucher.create({
            data: {
                userId,
                type: 'ADVANCE',
                amount: 1234,
                purpose: 'Simulated Test Voucher',
                date: new Date(),
                status: 'PENDING',
                amStatus: 'PENDING',
                cooStatus: 'PENDING'
            }
        });
        console.log('Created Voucher ID:', newVoucher.id);

        console.log('--- Step 2: Fetch My Vouchers ---');
        const vouchers = await prisma.voucher.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Found Vouchers Count:', vouchers.length);
        console.log('Voucher IDs:', vouchers.map(v => v.id));

        if (vouchers.length === 0) {
            console.error('ERROR: Voucher created but not found in getMyVouchers!');
        } else {
            console.log('SUCCESS: Flow works correctly.');
        }
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

simulateFlow();
