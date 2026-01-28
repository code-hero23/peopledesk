const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching all users...");
    const users = await prisma.user.findMany({
        select: { id: true, name: true, role: true, email: true }
    });
    console.table(users);

    console.log("\nFetching all LEAVE requests...");
    const leaves = await prisma.leaveRequest.findMany({
        include: { user: { select: { name: true } } }
    });
    console.table(leaves.map(l => ({
        id: l.id,
        user: l.user.name,
        type: l.type,
        status: l.status,
        bhStatus: l.bhStatus,
        hrStatus: l.hrStatus,
        targetBhId: l.targetBhId,
        bhId: l.bhId,
        hrId: l.hrId
    })));

    console.log("\nFetching all PERMISSION requests...");
    const permissions = await prisma.permissionRequest.findMany({
        include: { user: { select: { name: true } } }
    });
    console.table(permissions.map(p => ({
        id: p.id,
        user: p.user.name,
        date: p.date,
        status: p.status,
        bhStatus: p.bhStatus,
        hrStatus: p.hrStatus,
        targetBhId: p.targetBhId,
        bhId: p.bhId,
        hrId: p.hrId
    })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
