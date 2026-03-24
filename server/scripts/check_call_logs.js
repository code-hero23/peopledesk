const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'webapp.cookscape@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`Checking CallLog for User ID: ${user.id} (${user.name})`);
    
    const logs = await prisma.callLog.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log(`Found ${logs.length} CallLog entries.`);
    
    logs.forEach(log => {
        console.log('-------------------');
        console.log(`Date: ${log.date.toISOString()}`);
        console.log(`Total Calls: ${log.totalCalls}`);
        console.log(`Call Count in JSON: ${Array.isArray(log.calls) ? log.calls.length : 'N/A'}`);
        if (Array.isArray(log.calls) && log.calls.length > 0) {
            console.log('Sample Call:', JSON.stringify(log.calls[0], null, 2));
        }
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
