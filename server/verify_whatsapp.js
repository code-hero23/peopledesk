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

    const template = process.argv[2] || 'hello_world';
    const recipient = process.env.WHATSAPP_NOTIFICATION_NUMBER || 'MISSING';

    console.log('\nSending test notification to:', recipient);
    console.log('Using Template:', template);

    try {
        let result;
        if (template === 'hello_world') {
            result = await whatsappService.sendTemplateMessage(recipient, 'hello_world', [], 'en_US');
        } else if (template === 'missed_logout_alert') {
            result = await whatsappService.sendMissedLogoutNotification(recipient, 'Test Employee');
        } else if (template === 'missed_worklog_alert') {
            result = await whatsappService.sendMissedWorklogNotification(recipient, 'Test Employee');
        } else if (template === 'late_login_alert') {
            result = await whatsappService.sendLateLoginAlert(recipient, 'Test Employee', 3);
        } else if (template === 'break_exceed_alert') {
            result = await whatsappService.sendBreakExceedanceAlert(recipient, 'Test Employee', 'Tea Break', 15);
        } else {
            console.error('❌ Unknown template. Use: hello_world, missed_logout_alert, missed_worklog_alert, or late_login_alert');
            return;
        }
        
        if (result && result.success) {
            console.log(`\n✅ SUCCESS: "${template}" sent successfully!`);
            console.log('Response Detail:', JSON.stringify(result.data));
        } else {
            console.log(`\n❌ FAILED: Meta API rejected "${template}".`);
            console.log('Error Message:', result ? result.error : 'Unknown error');
            console.log('Ensure the template is Approved in your Meta Dashboard and the name matches exactly.');
        }
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
    }
}

testConnection();

// Usage help
if (!process.argv[2]) {
    console.log('\n💡 TIP: You can test specific templates by running:');
    console.log('node verify_whatsapp.js missed_logout_alert');
    console.log('node verify_whatsapp.js missed_worklog_alert');
    console.log('node verify_whatsapp.js late_login_alert');
}
