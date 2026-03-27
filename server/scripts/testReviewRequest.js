const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsappService = require('../src/utils/WhatsAppService');

async function testReviewRequest() {
    console.log('--- 🧪 PeopleDesk: Walkin Review Request TEST ---');
    
    // Get the entry ID from command line arguments
    const args = process.argv.slice(2);
    const entryIdStr = args.find(arg => arg.startsWith('--id='))?.split('=')[1] || args[0];
    const entryId = parseInt(entryIdStr);

    if (isNaN(entryId)) {
        console.error('❌ Error: Please provide a valid Walkin Entry ID. Usage: node testReviewRequest.js <id>');
        process.exit(1);
    }

    try {
        const entry = await prisma.walkinEntry.findUnique({
            where: { id: entryId }
        });

        if (!entry) {
            console.error(`❌ Error: Walkin Entry with ID ${entryId} not found.`);
            process.exit(1);
        }

        console.log(`🔍 Found Entry: ${entry.clientName} (${entry.contactNumber})`);
        
        // Brand image for the header (same as used in cron)
        const brandImageUrl = 'https://i.ibb.co/vzZ8jG4/cookscape-review-header.jpg';

        console.log(`📤 Sending WhatsApp Template (cookscape_review_request_media)...`);
        
        const result = await whatsappService.sendTemplateMessage(
            entry.contactNumber,
            'cookscape_review_request_media',
            [entry.clientName], // Body Params
            [brandImageUrl]     // Header Params (Image)
        );

        if (result.success) {
            console.log('✅ SUCCESS: WhatsApp review request successfully enqueued.');
            console.log('Meta API Response:', JSON.stringify(result.data, null, 2));
            
            // Note: We don't update the DB reviewSent status in the test script 
            // to allow you to run it again if needed.
        } else {
            console.error('❌ FAILED: WhatsApp API returned an error:');
            console.error(result.error);
        }

    } catch (error) {
        console.error('❌ SYSTEM ERROR:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testReviewRequest();
