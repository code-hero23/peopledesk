const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllVouchers() {
    try {
        const vouchers = await prisma.voucher.findMany({
            include: { user: { select: { id: true, name: true } } }
        });
        vouchers.forEach(v => {
            console.log(`Voucher #${v.id} | User: ${v.user.name} (ID: ${v.user.id}) | Amount: ${v.amount}`);
        });
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

listAllVouchers();
