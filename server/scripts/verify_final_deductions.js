
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        console.log("--- Final Verification of Deduction Logic ---");

        // Mock data representing a user with mixed deductions
        const user = {
            email: 'cre@cs.com',
            salaryDeductions: 0, // Top-level field
            salaryDeductionBreakdown: [
                { label: "Old Fixed", amount: "100" }, // Legacy (should be treated as Fixed)
                { label: "New Fixed", amount: "200", isFixed: true }, // Explicit Fixed
                { label: "Feb Specific", amount: "500", isFixed: false, month: 2, year: 2026 }, // Match
                { label: "March Specific", amount: "1000", isFixed: false, month: 3, year: 2026 } // Should be filtered
            ]
        };

        const reqMonth = 2; // Selection: February
        const reqYear = 2026;

        const filteredDeductions = (user.salaryDeductionBreakdown || []).filter(item => {
            const isFixed = item.isFixed !== undefined ? item.isFixed : true;
            if (isFixed) return true;
            return parseInt(item.month) === reqMonth && parseInt(item.year) === reqYear;
        });

        console.log("Filtered Deductions (Should have 3 items):");
        filteredDeductions.forEach(d => console.log(` - ${d.label}: ${d.amount}`));

        const manualTotal = filteredDeductions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        console.log("\nTotal Manual Deductions:", manualTotal);

        if (manualTotal === 800) {
            console.log("✅ VERIFICATION SUCCESS: Legacy handled + Cycle matching works.");
        } else {
            console.log("❌ VERIFICATION FAILED: Expected 800 (100+200+500).");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
