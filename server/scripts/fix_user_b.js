const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fixUserB = async () => {
    try {
        console.log('Finding user b...');
        // We don't know the email, so let's find by name "b" or just list all users to find the one with designation "AF"
        const users = await prisma.user.findMany({
            where: { designation: 'AF' }
        });

        console.log('Users with AF designation:', users);

        if (users.length > 0) {
            const result = await prisma.user.updateMany({
                where: { designation: 'AF' },
                data: { designation: 'AE' }
            });
            console.log(`Updated ${result.count} user(s) from AF to AE.`);
        } else {
            console.log('No "AF" users found. Checking name "b"...');
            const userB = await prisma.user.findFirst({
                where: { name: 'b' }
            });
            if (userB) {
                console.log('Found user b:', userB);
                const updated = await prisma.user.update({
                    where: { id: userB.id },
                    data: { designation: 'AE' }
                });
                console.log('Updated user b to AE:', updated);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

fixUserB();
