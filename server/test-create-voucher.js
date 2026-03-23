const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreate() {
    try {
        console.log('Starting test...');
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found');
            return;
        }

        const data = {
            userId: user.id,
            type: 'POSTPAID',
            amount: 100,
            purpose: 'Test Purpose ' + Date.now(),
            date: new Date(),
            proofUrl: '/api/uploads/test.png',
            status: 'PENDING',
            amStatus: 'PENDING',
            cooStatus: 'PENDING'
        };

        console.log('Creating voucher with data:', data);
        const voucher = await prisma.voucher.create({ data });
        console.log('Voucher created successfully:', voucher.id);
        
        // Clean up
        await prisma.voucher.delete({ where: { id: voucher.id } });
        console.log('Test voucher cleaned up');
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCreate();
