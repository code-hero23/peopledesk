const prisma = require('../src/config/prisma');

async function run() {
    const userEmailOrPhone = process.argv[2];
    const carrierName = process.argv[3] || 'Vi India';

    if (!userEmailOrPhone) {
        console.log('Usage: node scripts/set_user_carrier_sim.js <user_email_or_phone_or_id> [carrierName]');
        console.log('Example: node scripts/set_user_carrier_sim.js 9047325679 "Vi India"\n');
        try {
            const devices = await prisma.callSyncDevice.findMany({
                where: { active: true },
                include: { user: { select: { id: true, name: true, email: true, phone: true } } }
            });
            console.log(`Found ${devices.length} active enrolled devices:`);
            devices.forEach(d => {
                console.log(`  User ID: ${d.userId} | ${d.user?.name} | Phone: ${d.user?.phone || 'N/A'} | Current officialSim: "${d.officialSim}"`);
            });
        } catch (e) {}
        process.exit(1);
    }

    try {
        let user;
        const cleanInput = userEmailOrPhone.trim();
        const digitsOnly = cleanInput.replace(/\D/g, '');

        // If it's a small integer (< 1,000,000), treat as User ID first
        if (/^\d{1,6}$/.test(cleanInput)) {
            const numId = parseInt(cleanInput, 10);
            user = await prisma.user.findUnique({ where: { id: numId } });
        }

        // Search by phone, email, or name
        if (!user) {
            const conditions = [
                { email: { equals: cleanInput, mode: 'insensitive' } },
                { name: { contains: cleanInput, mode: 'insensitive' } }
            ];
            if (digitsOnly.length >= 7) {
                conditions.push({ phone: { contains: digitsOnly.slice(-10) } });
            }
            user = await prisma.user.findFirst({
                where: { OR: conditions }
            });
        }

        if (!user) {
            console.error(`User not found for query: ${userEmailOrPhone}`);
            process.exit(1);
        }

        console.log(`Found user: ${user.name} (ID: ${user.id}, Email: ${user.email}, Phone: ${user.phone})`);

        const device = await prisma.callSyncDevice.findFirst({
            where: { userId: user.id, active: true }
        });

        if (!device) {
            console.log(`No active CallSync device found for ${user.name}. When the employee activates the APK, choose 'Carrier: ${carrierName}'.`);
            process.exit(0);
        }

        await prisma.callSyncDevice.update({
            where: { id: device.id },
            data: { officialSim: carrierName }
        });

        console.log(`Successfully updated device (ID: ${device.id}) officialSim to: "${carrierName}"`);
        console.log(`The APK will automatically pull this configuration on its next sync.`);
    } catch (err) {
        console.error('Error updating device:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();

