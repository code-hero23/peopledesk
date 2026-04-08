const { checkAndNotifyExcessiveRequests } = require('../src/controllers/requestController');

// Provide a User ID that exists in your database and has a reportingBhId
// From our search, User ID 4 had reportingBhId 3.
const TEST_USER_ID = 4; 

async function testAlert() {
    console.log(`Checking/Sending test 6+ Alert for User ID: ${TEST_USER_ID}...`);
    try {
        // This will check the DB for 6+ records. 
        // Note: For this to send an actual email, the user must have 6+ permissions or leaves in the current cycle.
        await checkAndNotifyExcessiveRequests(TEST_USER_ID, new Date());
        console.log('Check completed. Check console/logs to see if email was dispatched.');
    } catch (err) {
        console.error('Failed to run test 6+ Alert:', err);
    }
}

testAlert();
