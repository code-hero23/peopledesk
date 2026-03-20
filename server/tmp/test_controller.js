const { createVoucher } = require('../src/controllers/voucherController');

// Mock req and res
const req = {
    user: { id: 1, role: 'EMPLOYEE' },
    body: {
        type: 'ADVANCE',
        amount: '1000',
        purpose: 'Test Debugging Final',
        date: new Date().toISOString()
    },
    file: null
};

const res = {
    statusCode: 200,
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log('RESPONSE STATUS:', this.statusCode);
        console.log('RESPONSE JSON:', JSON.stringify(data, null, 2));
        process.exit(0);
    }
};

async function test() {
    console.log('--- Starting Controller Test ---');
    try {
        await createVoucher(req, res);
    } catch (err) {
        console.error('UNCAUGHT ERROR in test script:', err);
        process.exit(1);
    }
}

test();
// Keep alive for a bit to let async finish if needed
setTimeout(() => {
    console.log('Test timed out');
    process.exit(1);
}, 5000);
