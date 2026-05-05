const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAM() {
    try {
        const user = await prisma.user.findFirst({
            where: { role: 'ACCOUNTS_MANAGER' }
        });
        console.log('AM found:', user ? { email: user.email, name: user.name } : 'None');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findAM();
