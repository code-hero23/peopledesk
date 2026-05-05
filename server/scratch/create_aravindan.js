const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function createAravindan() {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);
        const user = await prisma.user.upsert({
            where: { email: 'aravindan@cs.com' },
            update: {},
            create: {
                name: 'Aravindan S',
                email: 'aravindan@cs.com',
                password: hashedPassword,
                role: 'EMPLOYEE',
                designation: 'OFFICE ADMINISTRATION'
            }
        });
        console.log('User Aravindan S created/ready:', user.id);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAravindan();
