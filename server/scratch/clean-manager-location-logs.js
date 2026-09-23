const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const managers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ACCOUNTS_MANAGER', 'ANALYZER', 'FRONT_DESK_MANAGER'] } },
          { designation: { contains: 'MANAGER', mode: 'insensitive' } },
          { designation: { contains: 'ADMIN', mode: 'insensitive' } },
          { designation: { contains: 'HEAD', mode: 'insensitive' } },
          { designation: { equals: 'BH', mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, role: true, designation: true }
    });

    const managerIds = managers.map(m => m.id);
    console.log(`Found ${managers.length} manager/admin accounts:`, managers.map(m => `${m.name} (${m.role}/${m.designation})`));

    if (managerIds.length > 0) {
      const deleted = await prisma.aELocationLog.deleteMany({
        where: {
          userId: { in: managerIds }
        }
      });
      console.log(`Successfully purged ${deleted.count} location logs for manager/admin accounts.`);
    }
  } catch (err) {
    console.error('Error cleaning manager logs:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
