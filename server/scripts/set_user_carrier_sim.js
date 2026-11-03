const prisma = require('../src/config/prisma');

async function run() {
    const userEmailOrPhone = process.argv[2];
    const carrierName = process.argv[3] || 'Vi India';

    if (!userEmailOrPhone) {
        console.log('Usage: node scripts/set_user_carrier_sim.js <user_email_or_phone_or_id> [carrierName]');
        console.log('Example: node scripts/set_user_carrier_sim.js 9047325679 "Vi India"');
        process.exit(1);
    }

    try {
        let user;
        const numId = parseInt(userEmailOrPhone);
        if (!isNaN(numId) && String(numId) === userEmailOrPhone.trim()) {
            user = await prisma.user.findUnique({ where: { id: numId } });
        } else {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: { equals: userEmailOrPhone.trim(), mode: 'insensitive' } },
                        { phone: { contains: userEmailOrPhone.replace(/\D/g, '').slice(-10) } }
                    ]
                }
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

