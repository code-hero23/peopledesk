const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.voucher.count();
        console.log('Voucher count:', count);
        const users = await prisma.user.findMany({ take: 1 });
        console.log('User found:', !!users[0]);
    } catch (err) {
        console.error('Prisma test failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
