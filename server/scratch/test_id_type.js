const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testIdType() {
    try {
        console.log('Testing with string ID "11"...');
        const user = await prisma.user.findUnique({
            where: { id: "11" }
        });
        console.log('User found:', user ? user.name : 'null');
    } catch (error) {
        console.log('CAUGHT ERROR:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testIdType();
