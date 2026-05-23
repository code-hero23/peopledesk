const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVouchers() {
    try {
        const counts = await prisma.voucher.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });
        console.log('Voucher Status Counts:', JSON.stringify(counts, null, 2));

        const manageableCount = await prisma.voucher.count({
            where: {
                status: {
                    in: ['PENDING', 'APPROVED']
                }
            }
        });
        console.log('Count of vouchers that will now show in Pending:', manageableCount);

        const paidCount = await prisma.voucher.count({
            where: {
                status: 'PAID'
            }
        });
        console.log('Count of PAID vouchers that will now be HIDDEN from Pending:', paidCount);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkVouchers();
