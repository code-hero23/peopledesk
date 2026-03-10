const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initFinanceCron = () => {
    // Run at 00:00 on the 1st day of every 3rd month (Quarterly)
    // 0 0 1 1,4,7,10 *
    cron.schedule('0 0 1 1,4,7,10 *', async () => {
        console.log('Finance Quarterly Check: New quarter started.');
        try {
            // Here you could add automated reporting or notifications
            // For now, we just log it. The Admin handles the 'Wipe' manually for safety.
        } catch (error) {
            console.error('Finance Cron Error:', error);
        }
    });

    console.log('Finance Cron Initialized (Quarterly)');
};

module.exports = initFinanceCron;
