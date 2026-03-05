const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            password: true // Just check if it's there
        }
    });

    console.log(`Total users: ${users.length}`);
    users.forEach(u => {
        console.log(`- ${u.email} (${u.role}) | Password set: ${!!u.password}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
