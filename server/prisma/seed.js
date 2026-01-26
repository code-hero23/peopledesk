const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Admin User
    const adminEmail = 'admin@cookscape.com';
    const adminPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: 'Admin User',
            email: adminEmail,
            password: adminPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });

    console.log({ admin });

    // 2. Create Employee User
    const employeeEmail = 'employee@cookscape.com';
    const employeePassword = await bcrypt.hash('employee123', 10);

    const employee = await prisma.user.upsert({
        where: { email: employeeEmail },
        update: {},
        create: {
            name: 'John Doe',
            email: employeeEmail,
            password: employeePassword,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        },
    });

    console.log({ employee });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
