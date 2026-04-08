const { generateAndSendDailySummary } = require('../src/cron/DailySummaryCron');

async function testSummary() {
    console.log('Sending test Daily Summary Email...');
    try {
        await generateAndSendDailySummary();
        console.log('Test Daily Summary Email sent successfully!');
    } catch (err) {
        console.error('Failed to send test Daily Summary Email:', err);
    }
}

testSummary();
