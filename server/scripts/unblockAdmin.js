const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unblockAdmin() {
    try {
        console.log('Finding blocked admin...');
        const admin = await prisma.user.findFirst({
            where: {
                role: 'ADMIN',
                status: 'BLOCKED'
            }
        });

        if (!admin) {
            console.log('No blocked admin found.');
            // Fallback: Find ANY admin
            const anyAdmin = await prisma.user.findFirst({
                where: { role: 'ADMIN' }
            });
            if (anyAdmin) {
                console.log(`Found admin: ${anyAdmin.email} (Status: ${anyAdmin.status})`);
                if (anyAdmin.status !== 'ACTIVE') {
                    // Force active just in case
                    await prisma.user.update({
                        where: { id: anyAdmin.id },
                        data: { status: 'ACTIVE' }
                    });
                    console.log(`Admin ${anyAdmin.email} has been unblocked.`);
                }
            } else {
                console.log('No admin user found at all!');
            }
            return;
        }

        console.log(`Found blocked admin: ${admin.email}`);

        const updatedAdmin = await prisma.user.update({
            where: { id: admin.id },
            data: { status: 'ACTIVE' }
        });

        console.log(`Successfully unblocked admin: ${updatedAdmin.email}`);
    } catch (error) {
        console.error('Error unblocking admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

unblockAdmin();
