const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updateAEDesignation = async () => {
    try {
        console.log('Finding users to update...');

        // Update 'ar@cs.com'
        const user1 = await prisma.user.updateMany({
            where: { email: 'ar@cs.com' },
            data: { designation: 'AE' }
        });
        console.log(`Updated ar@cs.com: ${user1.count} record(s)`);

        // Update 'ae@cs.com'
        const user2 = await prisma.user.updateMany({
            where: { email: 'ae@cs.com' },
            data: { designation: 'AE' }
        });
        console.log(`Updated ae@cs.com: ${user2.count} record(s)`);

        // Check if correct
        const aeUsers = await prisma.user.findMany({
            where: {
                email: { in: ['ar@cs.com', 'ae@cs.com'] }
            },
            select: { email: true, designation: true }
        });
        console.log('Current State:', aeUsers);

    } catch (error) {
        console.error('Error updating users:', error);
    } finally {
        await prisma.$disconnect();
    }
};

updateAEDesignation();
