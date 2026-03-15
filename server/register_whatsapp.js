require('dotenv').config();
const axios = require('axios');

async function registerNumber() {
    console.log('--- WhatsApp Number Registration ---');
    
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.WHATSAPP_VERSION || 'v18.0';

    if (!phoneNumberId || !accessToken) {
        console.error('❌ ERROR: Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env');
        return;
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/register`;

    console.log(`Registering Phone ID: ${phoneNumberId}`);
    console.log(`Endpoint: ${url}\n`);

    try {
        const response = await axios.post(url, {
            messaging_product: 'whatsapp',
            pin: '111111' // Default PIN for initial registration
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ SUCCESS: Number registered successfully!');
        console.log('Response:', response.data);
        console.log('\nNow you can try running "node verify_whatsapp.js" again.');

    } catch (error) {
        console.error('❌ REGISTRATION FAILED');
        if (error.response) {
            console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
        
        console.log('\nCommon Fixes:');
        console.log('1. Ensure your Access Token has "whatsapp_business_messaging" and "whatsapp_business_management" permissions.');
        console.log('2. If you already set a 6-digit PIN in the Meta dashboard, change "111111" in this script to your PIN.');
    }
}

registerNumber();
