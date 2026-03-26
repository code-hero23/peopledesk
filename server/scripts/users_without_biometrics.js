const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUsersWithoutBiometrics() {
    try {
        console.log('--- Scanning users for missing biometric data ---\n');

        const users = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                role: 'EMPLOYEE'
            },
            select: {
                id: true,
                name: true,
                email: true,
                designation: true,
                biometricId: true,
                _count: {
                    select: { biometricLogs: true }
                }
            }
        });

        const withoutData = users.filter(u => !u.biometricId && u._count.biometricLogs === 0);
        const withIdOnly = users.filter(u => u.biometricId && u._count.biometricLogs === 0);

        if (withoutData.length === 0 && withIdOnly.length === 0) {
            console.log('✅ All active employees have at least a Biometric ID or some logs.');
        } else {
            if (withoutData.length > 0) {
                console.log(`❌ Found ${withoutData.length} employees with NO biometric data (No ID, No Logs):`);
                console.table(withoutData.map(u => ({
                    ID: u.id,
                    Name: u.name,
                    Email: u.email,
                    Designation: u.designation
                })));
            }

            if (withIdOnly.length > 0) {
                console.log(`\n⚠️ Found ${withIdOnly.length} employees with ID but NO Logs yet:`);
                console.table(withIdOnly.map(u => ({
                    ID: u.id,
                    Name: u.name,
                    BiometricID: u.biometricId
                })));
            }
        }

    } catch (error) {
        console.error('Error during scan:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

findUsersWithoutBiometrics();
