const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listVouchers() {
    try {
        const vouchers = await prisma.voucher.findMany({
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Total Vouchers found:', vouchers.length);
        console.log(JSON.stringify(vouchers, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listVouchers();
