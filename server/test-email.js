const { sendEmail } = require('./src/utils/emailService');

async function test() {
    console.log('Testing Email Service...');
    const result = await sendEmail({
        to: 'es.cookscape@gmail.com',
        subject: 'Test Email from PeopleDesk VPS',
        html: '<h1>Test</h1><p>If you see this, email service is working.</p>'
    });
    console.log('Result:', result);
    process.exit();
}

test();
