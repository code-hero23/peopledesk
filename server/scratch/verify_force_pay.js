const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateForcePay() {
    try {
        const voucherId = 19;
        const amEmail = 'accounts@cs.com';
        
        const amUser = await prisma.user.findUnique({ where: { email: amEmail } });
        if (!amUser) throw new Error('AM user not found');

        const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
        if (!voucher) throw new Error('Voucher not found');

        console.log('Simulating Force Pay for Voucher:', voucherId);

        // This simulates the controller logic
        const finalStatus = (voucher.type === 'POSTPAID' || voucher.type === 'COMPANY_PAY_AFTER') ? 'COMPLETED' : 'WAITING';
        
        await prisma.$transaction(async (tx) => {
            // Update Voucher
            await tx.voucher.update({
                where: { id: voucherId },
                data: {
                    status: finalStatus,
                    cooStatus: 'APPROVED',
                    cooRemarks: `Force Paid by AM: ${amUser.name}`,
                    cooApprovedAt: new Date(),
                    cooId: amUser.id,
                    adminRemarks: `Payment confirmed by ${amUser.name} (FORCE PAID)`
                }
            });

            // Create Notification for COO
            const coos = await tx.user.findMany({
                where: {
                    role: 'BUSINESS_HEAD',
                    OR: [
                        { designation: 'COO' },
                        { designation: 'Chief Operational Officer' }
                    ]
                }
            });

            for (const coo of coos) {
                await tx.notification.create({
                    data: {
                        userId: coo.id,
                        title: '🚨 Voucher Force Paid',
                        message: `Voucher #${voucherId} for ₹${voucher.amount.toLocaleString()} was force-paid by AM (${amUser.name}) without COO approval.`,
                        type: 'URGENT',
                        relatedId: voucherId
                    }
                });
            }
        });

        console.log('Force Pay simulated successfully.');

        // Verify Notification
        const notifications = await prisma.notification.findMany({
            where: { relatedId: voucherId }
        });
        console.log('Notifications created:', notifications.length);
        notifications.forEach(n => console.log(`- To User ${n.userId}: ${n.title} - ${n.message}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

simulateForcePay();
