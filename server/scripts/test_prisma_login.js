
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Testing Prisma Query for Login...");
        const user = await prisma.user.findUnique({
            where: { email: 'cre@cs.com' }
        });
        console.log("Query Successful:", !!user);
    } catch (e) {
        console.error("Query Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
