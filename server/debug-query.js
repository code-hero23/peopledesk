const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugQuery() {
    const userId = 14; // Gopi
    const userRole = 'HR';

    console.log(`Simulating HR History Query for ${userId} (HR)`);

    // Logic from adminController.js
    const leaveWhere = { status: { in: ['APPROVED', 'REJECTED'] } };
    const permissionWhere = { status: { in: ['APPROVED', 'REJECTED'] } };

    console.log("Querying Leaves with:", JSON.stringify(leaveWhere));
    const leaves = await prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50
    });
    console.log("Leaves Found:", leaves.length);
    if (leaves.length > 0) console.log(leaves[0]);

    console.log("Querying Permissions with:", JSON.stringify(permissionWhere));
    const permissions = await prisma.permissionRequest.findMany({
        where: permissionWhere,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50
    });
    console.log("Permissions Found:", permissions.length);
}

debugQuery()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
