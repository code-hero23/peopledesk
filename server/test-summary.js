const { generateAndSendDailySummary } = require('./src/cron/DailySummaryCron');

async function runTest() {
    console.log('--- Manual Summary Report Test ---');
    try {
        // You can change the date here if you want to test yesterday
        const testDate = new Date(); 
        console.log(`Running for: ${testDate.toLocaleDateString()}`);
        
        const result = await generateAndSendDailySummary(testDate);
        
        if (result) {
            console.log('SUCCESS: Summary report generated and emailed to HR.');
        } else {
            console.log('FAILED: Email service returned false.');
        }
    } catch (error) {
        console.error('ERROR during report generation:', error);
    }
    process.exit();
}

runTest();
