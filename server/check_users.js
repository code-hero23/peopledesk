const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            designation: true,
            password: true // Just check if it's there
        }
    });

    console.log(`Total users: ${users.length}`);
    users.forEach(u => {
        console.log(`- ${u.name} | ${u.email} (${u.role} - ${u.designation}) | Password set: ${!!u.password}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
