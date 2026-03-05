const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const cres = await prisma.user.findMany({
            where: {
                designation: 'CRE'
            }
        });
        console.log('CRE Users found:', cres.length);
        cres.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, Designation: ${u.designation}, Role: ${u.role}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
