const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestVoucher() {
    try {
        // Find a regular employee
        const employee = await prisma.user.findFirst({
            where: { role: 'EMPLOYEE' }
        });

        if (!employee) {
            console.log('No employee found to create voucher for');
            return;
        }

        const voucher = await prisma.voucher.create({
            data: {
                userId: employee.id,
                type: 'PREPAID', // Not in the old immediate list
                amount: 1500,
                purpose: 'Test for Universal Force-Pay',
                date: new Date(),
                status: 'PENDING',
                amStatus: 'APPROVED', // Assume AM already approved it
                cooStatus: 'PENDING'
            }
        });
        console.log('Test voucher created:', voucher.id);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestVoucher();
