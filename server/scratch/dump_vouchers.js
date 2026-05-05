const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dumpVouchers() {
    try {
        const vouchers = await prisma.voucher.findMany({
            include: { user: { select: { id: true, name: true, email: true } } }
        });
        console.log(JSON.stringify(vouchers, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

dumpVouchers();
