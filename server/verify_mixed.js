const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getMySalarySummary } = require('./src/controllers/salaryController');

async function verifyMixedDeductions() {
    console.log('--- Verifying Mixed (Fixed + Cycle) Deductions ---');

    // 1. Setup test user with mixed deductions
    const user = await prisma.user.findFirst({ where: { email: 'ofc@gmail.com' } });
    if (!user) return console.log('User not found');

    const breakdown = [
        { label: 'Recurring PF', amount: 1500, isFixed: true },
        { label: 'Feb One-Time Advance', amount: 2000, isFixed: false, month: 2, year: 2026 },
        { label: 'March One-Time Loan', amount: 5000, isFixed: false, month: 3, year: 2026 }
    ];

    await prisma.user.update({
        where: { id: user.id },
        data: { salaryDeductionBreakdown: breakdown }
    });

    console.log('Deductions Setup: PF (Fixed), Feb Advance (One-time), March Loan (One-time)');

    // 2. Test February Cycle (Jan 26 - Feb 25)
    console.log('\n>> Testing February 2026:');
    const reqFeb = { user: { id: user.id }, query: { month: 2, year: 2026 } };
    const resFeb = {
        json: (data) => {
            console.log(`Included Deductions: ${data.financials.deductionBreakdown.map(d => d.label).join(', ')}`);
            const total = data.financials.manualDeductions;
            console.log(`Total Deduction Amount: ${total} (Expected: 3500)`);
            if (total === 3500) console.log('✅ February Match!');
        },
        status: (code) => ({ json: (d) => console.log(d) })
    };
    await getMySalarySummary(reqFeb, resFeb);

    // 3. Test March Cycle (Feb 26 - March 25)
    console.log('\n>> Testing March 2026:');
    const reqMar = { user: { id: user.id }, query: { month: 3, year: 2026 } };
    const resMar = {
        json: (data) => {
            console.log(`Included Deductions: ${data.financials.deductionBreakdown.map(d => d.label).join(', ')}`);
            const total = data.financials.manualDeductions;
            console.log(`Total Deduction Amount: ${total} (Expected: 6500)`);
            if (total === 6500) console.log('✅ March Match!');
        },
        status: (code) => ({ json: (d) => console.log(d) })
    };
    await getMySalarySummary(reqMar, resMar);

    await prisma.$disconnect();
}

verifyMixedDeductions();
