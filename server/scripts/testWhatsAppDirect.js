const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const whatsappService = require('../src/utils/WhatsAppService');

/**
 * Script to test WhatsApp templates directly by number
 */
async function testWhatsAppDirect() {
    const args = process.argv.slice(2);
    const phoneNumber = args[0];
    const clientName = args[1] || 'Valued Client';

    if (!phoneNumber) {
        console.error('❌ Error: Please provide a phone number. Usage: node testWhatsAppDirect.js <number> <optional_name>');
        process.exit(1);
    }

    console.log(`--- 🧪 WhatsApp Direct Test: ${phoneNumber} ---`);
    
    // Brand image for the header (Verified stable link)
    const brandImageUrl = 'https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?q=80&w=500&auto=format&fit=crop';

    console.log(`📤 Sending Template (cookscape_review_request_media)...`);

    try {
        const result = await whatsappService.sendTemplateMessage(
            phoneNumber,
            'cookscape_review_request_media',
            [clientName],      // Body: {{1}}
            [brandImageUrl]    // Header: Image Link
        );

        if (result.success) {
            console.log('✅ SUCCESS: Message sent to Meta successfully.');
            console.log('Response:', JSON.stringify(result.data, null, 2));
        } else {
            console.error('❌ FAILED: Meta API Error:');
            console.error(result.error);
        }
    } catch (err) {
        console.error('❌ CRITICAL ERROR:', err.message);
    }
}

testWhatsAppDirect();
