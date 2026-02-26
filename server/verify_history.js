const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getMySalarySummary } = require('./src/controllers/salaryController');

async function verifyHistoricalCycles() {
    console.log('--- Verifying Historical Payroll Cycles ---');

    const user = await prisma.user.findFirst({
        where: { email: 'ofc@gmail.com' }
    });

    if (!user) {
        console.log('Test user ofc@gmail.com not found.');
        return;
    }

    // Test cases for different months
    const testCases = [
        { month: 1, year: 2026, label: 'Jan 2026 (Should be Dec 26 - Jan 25)' },
        { month: 2, year: 2026, label: 'Feb 2026 (Should be Jan 26 - Feb 25)' },
        { month: 12, year: 2025, label: 'Dec 2025 (Should be Nov 26 - Dec 25)' }
    ];

    for (const tc of testCases) {
        console.log(`\nTesting: ${tc.label}`);
        const req = {
            user: { id: user.id },
            query: { month: tc.month, year: tc.year }
        };
        const res = {
            json: (data) => {
                console.log(`Cycle: ${data.cycle.start} to ${data.cycle.end}`);
                console.log(`Stats - Present: ${data.stats.presentDays}, Absent: ${data.stats.absentDays}`);
            },
            status: (code) => ({ json: (data) => console.log(`Error ${code}:`, data) })
        };
        await getMySalarySummary(req, res);
    }

    await prisma.$disconnect();
}

verifyHistoricalCycles();
