require('dotenv').config();
const whatsappService = require('./src/utils/WhatsAppService');

async function testConnection() {
    console.log('--- WhatsApp Integration Test ---');
    
    const config = {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'Present (Hidden)' : 'MISSING',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'MISSING',
        version: process.env.WHATSAPP_VERSION || 'v18.0',
        testNumber: process.env.WHATSAPP_NOTIFICATION_NUMBER || 'MISSING'
    };

    console.table(config);

    if (config.accessToken === 'MISSING' || config.phoneNumberId === 'MISSING' || config.testNumber === 'MISSING') {
        console.error('\n❌ ERROR: Missing required environment variables in server/.env');
        console.log('Please check your .env file and ensure WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_NOTIFICATION_NUMBER are set.');
        return;
    }

    console.log('\nSending test notification to:', config.testNumber);
    console.log('Using Template: hello_world (Standard Meta test template)');

    try {
        const result = await whatsappService.sendTemplateMessage(config.testNumber, 'hello_world', []);
        
        if (result) {
            console.log('\n✅ SUCCESS: Message sent to Meta API!');
            console.log('Check your WhatsApp device for the notification.');
        } else {
            console.log('\n❌ FAILED: API response was empty or returned an error.');
            console.log('Check the logs above for specific error messages from Meta.');
        }
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
    }
}

testConnection();
