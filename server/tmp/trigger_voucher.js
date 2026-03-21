const axios = require('axios');

async function testCreateVoucher() {
    try {
        const baseUrl = 'http://localhost:5000/api';
        
        // We need a valid token. Let's try to login or use a known one if possible.
        // For now, let's just see if we can trigger the 500 and see the server logs.
        
        console.log("Simulating voucher creation request...");
        // This is just a placeholder to trigger the server and check console
    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

testCreateVoucher();
