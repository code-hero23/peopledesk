const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsappService = require('../utils/WhatsAppService');

const initReviewRequestCron = () => {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log('--- CRON: Checking for pending Review Requests ---');
        try {
            const twoHoursAgo = new Date();
            twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

            // Find entries where visit is finished, 2 hours passed, and review not sent
            const pendingEntries = await prisma.walkinEntry.findMany({
                where: {
                    outTimeRecordedAt: {
                        lte: twoHoursAgo,
                        not: null
                    },
                    reviewSent: false,
                    contactNumber: {
                        not: ''
                    }
                }
            });

            if (pendingEntries.length === 0) {
                console.log('CRON: No pending review requests found.');
                return;
            }

            console.log(`CRON: Found ${pendingEntries.length} pending review requests.`);

            for (const entry of pendingEntries) {
                try {
                    // Send WhatsApp Template: cookscape_review_request_media
                    // Parameters: {{1}} = Client Name
                    const result = await whatsappService.sendTemplateMessage(
                        entry.contactNumber,
                        'cookscape_review_request_media',
                        [entry.clientName]
                    );

                    if (result.success) {
                        await prisma.walkinEntry.update({
                            where: { id: entry.id },
                            data: { reviewSent: true }
                        });
                        console.log(`CRON: Review request sent to ${entry.clientName} (${entry.contactNumber})`);
                    } else {
                        console.error(`CRON: Failed to send review request to ${entry.clientName}:`, result.error);
                    }
                } catch (sendErr) {
                    console.error(`CRON: Error processing entry ${entry.id}:`, sendErr.message);
                }
            }
        } catch (error) {
            console.error('CRON Error in ReviewRequestCron:', error.message);
        }
    });
};

module.exports = initReviewRequestCron;
