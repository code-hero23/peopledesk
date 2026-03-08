const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const webpush = require('web-push');

// Configure web-push
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const initNotificationCron = () => {
    // Schedule task: Every hour at 30 minutes past the hour
    // Window: 10:30 AM to 7:30 PM (10:30 to 19:30)
    cron.schedule('30 10-19 * * *', async () => {
        console.log('Running Hourly AE Alert Cron Job at :30');
        
        try {
            // 1. Get all AE users who have push subscriptions
            const aeUsers = await prisma.user.findMany({
                where: {
                    designation: 'AE',
                    status: 'ACTIVE',
                    pushSubscriptions: {
                        some: {} // Has at least one subscription
                    }
                },
                include: {
                    pushSubscriptions: true
                }
            });

            if (aeUsers.length === 0) {
                console.log('No AE users with push subscriptions found.');
                return;
            }

            const payload = JSON.stringify({
                title: '⏰ PeopleDesk Hourly Update',
                body: 'It\'s 30 mins past the hour! Time to update your project status.',
                icon: '/orbix-logo.png',
                badge: '/orbix-logo.png',
                tag: 'hourly-alarm',
                data: {
                    url: '/dashboard'
                }
            });

            // 2. Send push to each subscription
            const sendPromises = aeUsers.flatMap(user => 
                user.pushSubscriptions.map(sub => {
                    const pushConfig = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    };

                    return webpush.sendNotification(pushConfig, payload)
                        .catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                // Subscription expired or no longer valid
                                console.log(`Push subscription expired for user ${user.id}, deleting...`);
                                return prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                            }
                            console.error(`Error sending push to user ${user.id}:`, err);
                        });
                })
            );

            await Promise.all(sendPromises);
            console.log(`Sent hourly push alerts to ${aeUsers.length} AE users.`);

        } catch (error) {
            console.error('Fatal error in Notification Cron:', error);
        }
    });
};

module.exports = initNotificationCron;
