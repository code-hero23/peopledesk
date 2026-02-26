const { getCycleStartDateIST, getCycleEndDateIST } = require('../src/utils/dateHelpers');

// Using imported functions from dateHelpers.js

const testDates = [
    new Date('2026-02-25T10:00:00Z'),
    new Date('2026-02-26T10:00:00Z'),
    new Date('2026-01-01T10:00:00Z'),
    new Date('2025-12-25T10:00:00Z'),
    new Date('2025-12-26T10:00:00Z'),
];

testDates.forEach(d => {
    console.log(`Input: ${d.toISOString()}`);
    console.log(`Cycle Start (UTC for DB): ${getCycleStartDateIST(d).toISOString()}`);
    console.log(`Cycle End (UTC for DB): ${getCycleEndDateIST(d).toISOString()}`);
    console.log('---');
});
