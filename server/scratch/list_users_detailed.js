const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.user.findMany();
        users.forEach(u => console.log(`${u.id} | ${u.name} | ${u.email} | ${u.role}`));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
