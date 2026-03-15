const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsappService = require('../utils/WhatsAppService');

/**
 * Monitors active breaks and sends WhatsApp alerts if they exceed the allowed time.
 * Tea Break: 15 mins
 * Lunch Break: 45 mins
 */
const initBreakExceedanceCron = () => {
    // Run every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
        const now = new Date();

        try {
            // Find all active breaks (no endTime) that haven't been alerted yet
            const activeBreaks = await prisma.breakLog.findMany({
                where: {
                    endTime: null,
                    isExceededAlertSent: false,
                    breakType: { in: ['TEA', 'LUNCH'] }
                },
                include: {
                    attendance: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (activeBreaks.length === 0) return;

            console.log(`[BreakCron] Checking ${activeBreaks.length} active breaks...`);

            for (const b of activeBreaks) {
                const startTime = new Date(b.startTime);
                const durationMinutes = Math.round((now - startTime) / 60000);
                const user = b.attendance.user;

                if (!user || !user.phone) continue;

                let limit = 0;
                let breakName = '';

                if (b.breakType === 'TEA') {
                    limit = 15;
                    breakName = 'Tea Break';
                } else if (b.breakType === 'LUNCH') {
                    limit = 45;
                    breakName = 'Lunch Break';
                }

                if (durationMinutes > limit) {
                    console.log(`[BreakCron] Alert: User ${user.name} exceeded ${breakName} (${durationMinutes} mins)`);
                    
                    const result = await whatsappService.sendBreakExceedanceAlert(
                        user.phone,
                        user.name,
                        breakName,
                        limit
                    );

                    if (result) {
                        // Mark as sent to prevent multiple alerts for the same break session
                        await prisma.breakLog.update({
                            where: { id: b.id },
                            data: { isExceededAlertSent: true }
                        });
                    } else {
                        console.warn(`[BreakCron] Failed to send WhatsApp alert for ${user.name}`);
                    }
                }
            }
        } catch (error) {
            console.error('[BreakCron] Error:', error);
        }
    });
};

module.exports = initBreakExceedanceCron;
