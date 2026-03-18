const prisma = require('../config/db');

/**
 * Verify Webhook from Meta (GET request)
 */
const verifyWebhook = async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'peopledesk_verify_token';

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

/**
 * Handle Webhook Events from Meta (POST request)
 */
const handleWebhook = async (req, res) => {
    try {
        const body = req.body;

        // Log the incoming webhook for debugging
        console.log('Incoming WhatsApp Webhook:', JSON.stringify(body, null, 2));

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from; // extract the phone number from the recipient
                const msg_body = message.text ? message.text.body : ''; // extract the message text

                console.log(`Received message from ${from}: ${msg_body}`);
            }
            
            // Check for status updates (Delivered, Read, Failed)
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.statuses &&
                body.entry[0].changes[0].value.statuses[0]
            ) {
                const status = body.entry[0].changes[0].value.statuses[0];
                const recipient_id = status.recipient_id;
                const message_status = status.status;
                const message_id = status.id;

                console.log(`Message ${message_id} to ${recipient_id} status: ${message_status}`);

                if (status.errors) {
                    console.error(`WhatsApp Status Error for ${recipient_id}:`, JSON.stringify(status.errors, null, 2));
                }
            }

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
};

module.exports = {
    verifyWebhook,
    handleWebhook
};
