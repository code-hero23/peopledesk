const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyUserB = async () => {
    try {
        const userB = await prisma.user.findFirst({
            where: { email: 'b@cs.com' } // Assuming this is user 'b' from previous context
        });
        console.log('User B status:', userB);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

verifyUserB();
