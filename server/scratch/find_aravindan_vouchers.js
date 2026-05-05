const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAravindanVouchers() {
    try {
        const users = await prisma.user.findMany({
            where: { name: { contains: 'Aravindan', mode: 'insensitive' } },
            include: { vouchers: true }
        });
        
        if (users.length === 0) {
            console.log('No user found with name Aravindan');
        } else {
            users.forEach(u => {
                console.log(`User: ${u.name} (ID: ${u.id})`);
                console.log(`Voucher count: ${u.vouchers.length}`);
                if (u.vouchers.length > 0) {
                    u.vouchers.forEach(v => {
                        console.log(`  - Voucher #${v.id}: ${v.amount} (${v.status})`);
                    });
                }
            });
        }
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

findAravindanVouchers();
