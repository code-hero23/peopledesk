const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRaiseForOthers() {
    try {
        // Admin (ID 1) raises for cre1 (ID 6)
        const adminId = 1;
        const targetEmployeeId = 6;
        
        const voucher = await prisma.voucher.create({
            data: {
                userId: targetEmployeeId,
                type: 'OFFICE_EXPENSES',
                amount: 750,
                purpose: 'Testing Raise For Others Feature',
                date: new Date(),
                status: 'PENDING',
                amStatus: 'APPROVED', // Auto-approved because raised by Admin
                amId: adminId,
                amApprovedAt: new Date()
            }
        });
        
        console.log(`Successfully raised voucher #${voucher.id} for Employee ID ${targetEmployeeId} by Admin ID ${adminId}`);
        
        // Verify it shows up in cre1's vouchers
        const employeeVouchers = await prisma.voucher.findMany({
            where: { userId: targetEmployeeId }
        });
        console.log(`Employee ID ${targetEmployeeId} now has ${employeeVouchers.length} vouchers.`);
        
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testRaiseForOthers();
