const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching last 5 attendance records...');
    const attendances = await prisma.attendance.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } }
    });

    if (attendances.length === 0) {
        console.log('No attendance records found.');
    } else {
        attendances.forEach(a => {
            console.log(`User: ${a.user.name}, Date: ${a.date}, DeviceInfo: ${a.deviceInfo || 'NULL'}, IP: ${a.ipAddress || 'NULL'}`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
