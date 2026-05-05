const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUser() {
    try {
        const user = await prisma.user.findFirst({
            where: { name: { contains: 'Aravindan', mode: 'insensitive' } }
        });
        console.log('User found:', JSON.stringify(user, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findUser();
