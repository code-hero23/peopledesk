const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getStartOfDayIST, getEndOfDayIST } = require('../utils/dateHelpers');

/**
 * Cron Job to check for missed worklogs daily at 08:00 PM IST.
 */
const initWorklogReminderCron = () => {
    cron.schedule('0 20 * * *', async () => {
        console.log('CRON: Running Worklog Reminder Job [08:00 PM IST]...');

        try {
            const start = getStartOfDayIST();
            const end = getEndOfDayIST();

            // 1. Get all ACTIVE employees
            const activeUsers = await prisma.user.findMany({
                where: {
                    status: 'ACTIVE',
                    role: 'EMPLOYEE'
                }
            });

            console.log(`CRON: Checking worklogs for ${activeUsers.length} active employees...`);

            for (const user of activeUsers) {
                // Check if user submitted a CLOSED worklog for today
                const workLog = await prisma.workLog.findFirst({
                    where: {
                        userId: user.id,
                        date: {
                            gte: start,
                            lte: end
                        },
                        logStatus: 'CLOSED'
                    }
                });

                if (!workLog) {
                    console.log(`CRON: User ${user.name} has not submitted their worklog for today.`);
                    
                    // Trigger WhatsApp Notification
                    try {
                        const whatsAppService = require('../utils/WhatsAppService');
                        if (user.phone) {
                            await whatsAppService.sendMissedWorklogNotification(user.phone, user.name);
                        }
                    } catch (wsError) {
                        console.error(`CRON: WhatsApp error for ${user.name}:`, wsError.message);
                    }
                }
            }

            console.log('CRON: Worklog Reminder Job completed.');
        } catch (error) {
            console.error('CRON FATAL: Error in worklogReminderCron:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('Worklog Reminder Cron Job Initialized');
};

module.exports = initWorklogReminderCron;
