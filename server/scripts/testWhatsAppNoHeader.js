const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const whatsappService = require('../src/utils/WhatsAppService');

/**
 * Script to test WhatsApp templates WITHOUT a header parameter
 * (To check if Meta uses the default image you added in the dashboard)
 */
async function testWhatsAppNoHeader() {
    const args = process.argv.slice(2);
    const phoneNumber = args[0];
    const clientName = args[1] || 'Valued Client';

    if (!phoneNumber) {
        console.error('❌ Error: Please provide a phone number. Usage: node testWhatsAppNoHeader.js <number>');
        process.exit(1);
    }

    console.log(`--- 🧪 WhatsApp Test (NO HEADER PARAMS): ${phoneNumber} ---`);
    console.log(`📤 Sending Template (cookscape_review_request_media)...`);

    try {
        // We pass empty array for both body and header to see what happens, 
        // or just body if the template has {{1}}
        const result = await whatsappService.sendTemplateMessage(
            phoneNumber,
            'cookscape_review_request_media',
            [clientName], // Body: {{1}}
            []            // NO HEADER PARAMS
        );

        if (result.success) {
            console.log('✅ SUCCESS: Message enqueued by Meta.');
            console.log('Response:', JSON.stringify(result.data, null, 2));
        } else {
            console.error('❌ FAILED: Meta API Error:');
            console.error(result.error);
        }
    } catch (err) {
        console.error('❌ CRITICAL ERROR:', err.message);
    }
}

testWhatsAppNoHeader();
