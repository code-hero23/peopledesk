const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const webpush = require('web-push');

// Configure web-push
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
const subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        const { endpoint, keys } = subscription;

        // Save or update subscription
        const pushSubscription = await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                userId,
                p256dh: keys.p256dh,
                auth: keys.auth
            },
            create: {
                userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            }
        });

        res.status(201).json({ 
            message: 'Successfully subscribed to push notifications',
            subscriptionId: pushSubscription.id
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ message: 'Server error during subscription' });
    }
};

// @desc    Unsubscribe from push notifications
// @route   POST /api/notifications/unsubscribe
// @access  Private
const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;

        await prisma.pushSubscription.delete({
            where: { endpoint }
        });

        res.status(200).json({ message: 'Successfully unsubscribed' });
    } catch (error) {
        console.error('Unsubscription error:', error);
        res.status(500).json({ message: 'Server error during unsubscription' });
    }
};

module.exports = {
    subscribe,
    unsubscribe
};
