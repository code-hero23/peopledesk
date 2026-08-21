require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsAppService = require('./src/utils/WhatsAppService');

async function testVisitorFeature() {
    console.log('\n==================================================');
    console.log('       📋 PEOPLE-DESK VISITOR FEATURE TEST        ');
    console.log('==================================================\n');

    // 1. Check DB Connection & Table Existence
    try {
        console.log('🔍 Checking Database Connection & VisitorRecord table...');
        const count = await prisma.visitorRecord.count();
        console.log(`✅ Database connection successful! Total Visitor Records in DB: ${count}`);
    } catch (err) {
        console.error('❌ Database error: Could not query VisitorRecord table.');
        console.error('   Message:', err.message);
        console.log('👉 Make sure you ran node scripts/safe_update.js on your VPS.\n');
        process.exit(1);
    }

    // 2. Fetch Specific Staff Accounts by Provided Emails
    console.log('\n🔍 Searching Staff Accounts by Provided Emails...');
    
    const targetEmails = {
        cre: 'preethishankar0515@gmail.com',
        fa: 'haseenaayeshaa@gmail.com',
        la: 'sridhark0641@gmail.com',
        bh: 'it.cookscape@gmail.com'
    };

    const creUser = await prisma.user.findFirst({ where: { email: { equals: targetEmails.cre, mode: 'insensitive' } } });
    const faUser = await prisma.user.findFirst({ where: { email: { equals: targetEmails.fa, mode: 'insensitive' } } });
    const laUser = await prisma.user.findFirst({ where: { email: { equals: targetEmails.la, mode: 'insensitive' } } });
    const bhUser = await prisma.user.findFirst({ where: { email: { equals: targetEmails.bh, mode: 'insensitive' } } });

    // Fallback if any missing
    const defaultUser = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });

    const finalCRE = creUser || defaultUser;
    const finalFA = faUser || defaultUser;
    const finalLA = laUser || defaultUser;
    const finalBH = bhUser || defaultUser;

    console.log(` • CRE (${targetEmails.cre}) : ${finalCRE ? `${finalCRE.name} (Phone: ${finalCRE.phone || 'N/A'})` : 'Not found'}`);
    console.log(` • FA  (${targetEmails.fa})  : ${finalFA ? `${finalFA.name} (Phone: ${finalFA.phone || 'N/A'})` : 'Not found'}`);
    console.log(` • LA  (${targetEmails.la})  : ${finalLA ? `${finalLA.name} (Phone: ${finalLA.phone || 'N/A'})` : 'Not found'}`);
    console.log(` • BH  (${targetEmails.bh})  : ${finalBH ? `${finalBH.name} (Phone: ${finalBH.phone || 'N/A'})` : 'Not found'}`);

    if (!finalCRE) {
        console.error('❌ No user accounts found in database.');
        process.exit(1);
    }

    // 3. Create a Test Visitor Record
    console.log('\n📝 Inserting Test Visitor Record into Database...');
    let testRecord;
    try {
        testRecord = await prisma.visitorRecord.create({
            data: {
                clientName: 'Test Client - ' + new Date().toLocaleTimeString(),
                phoneNumber: '919092705679',
                reasonOfVisit: 'Design discussion - 1st',
                showroom: 'MTRS',
                dateOfVisit: new Date(),
                timeOfEntry: '10:30',
                creId: finalCRE.id,
                faId: finalFA ? finalFA.id : null,
                laId: finalLA ? finalLA.id : null,
                bhId: finalBH ? finalBH.id : null,
                notes: 'Automated test entry for specific CRE, FA, LA, BH accounts'
            },
            include: {
                cre: true,
                fa: true,
                la: true,
                bh: true
            }
        });
        console.log(`✅ Test Visitor Record created successfully! Record ID: ${testRecord.id}`);
        console.log(`   Client: ${testRecord.clientName} | Phone: ${testRecord.phoneNumber} | Showroom: ${testRecord.showroom}`);
    } catch (createErr) {
        console.error('❌ Failed to insert VisitorRecord:', createErr.message);
        process.exit(1);
    }

    // 4. Dispatch WhatsApp Notifications to All Stakeholders
    console.log('\n📲 Testing WhatsApp Notification Dispatch to Stakeholders...');
    
    const details = {
        clientName: testRecord.clientName,
        phoneNumber: testRecord.phoneNumber,
        reasonOfVisit: testRecord.reasonOfVisit,
        showroom: testRecord.showroom,
        dateOfVisit: testRecord.dateOfVisit,
        timeOfEntry: testRecord.timeOfEntry,
        creName: testRecord.cre?.name || 'Preethi (CRE)',
        faName: testRecord.fa?.name || 'Haseena (FA)',
        laName: testRecord.la?.name || 'Sridhar (LA)',
        bhName: testRecord.bh?.name || 'IT Cookscape (BH)'
    };

    const recipients = [
        { role: 'CRE', user: finalCRE },
        { role: 'FA', user: finalFA },
        { role: 'LA', user: finalLA },
        { role: 'BH', user: finalBH }
    ];

    const fallbackPhone = process.env.WHATSAPP_NOTIFICATION_NUMBER || '919092705679';
    const deliveryLogs = [];

    for (const item of recipients) {
        const phone = item.user?.phone || fallbackPhone;
        console.log(`\n📤 Sending alert to ${item.role} (${item.user?.name || 'N/A'} - Phone: ${phone})...`);
        try {
            const waResult = await whatsAppService.sendVisitorRecordNotification(phone, details);
            if (waResult.success) {
                console.log(`   ✅ SUCCESS: WhatsApp sent to ${item.role} (${phone})`);
                deliveryLogs.push({ role: item.role, phone, success: true, response: waResult });
            } else {
                console.warn(`   ⚠️ FAILED to send to ${item.role} (${phone}):`, waResult.error);
                deliveryLogs.push({ role: item.role, phone, success: false, error: waResult.error });
            }
        } catch (err) {
            console.error(`   ❌ Error sending to ${item.role}:`, err.message);
        }
    }

    // Update DB record log
    await prisma.visitorRecord.update({
        where: { id: testRecord.id },
        data: {
            whatsappSent: deliveryLogs.some(l => l.success),
            whatsappLog: JSON.stringify(deliveryLogs)
        }
    });

    console.log('\n==================================================');
    console.log('🎉 VISITOR RECORD FEATURE VERIFICATION COMPLETE!');
    console.log('==================================================\n');
}

testVisitorFeature()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
