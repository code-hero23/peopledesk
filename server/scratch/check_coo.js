const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCOOs() {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: 'BUSINESS_HEAD',
                OR: [
                    { designation: 'COO' },
                    { designation: 'Chief Operational Officer' }
                ]
            }
        });
        console.log('COOs found:', users.map(u => ({ id: u.id, name: u.name, designation: u.designation })));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCOOs();
