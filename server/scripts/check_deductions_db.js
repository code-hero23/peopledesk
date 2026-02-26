
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: { contains: 'cre' } } // Based on screenshot email watermark 'creics.com' maybe? Or just 'cre'
        });

        if (!user) {
            console.log("User not found");
            return;
        }

        console.log("--- User Deduction Info ---");
        console.log("Email:", user.email);
        console.log("salaryViewEnabled:", user.salaryViewEnabled);
        console.log("salaryDeductionBreakdown:", JSON.stringify(user.salaryDeductionBreakdown, null, 2));

        // Let's also check if the mapping in the controller matches
        const month = 2; // Selection in screenshot
        const year = 2026;

        const filtered = (user.salaryDeductionBreakdown || []).filter(item => {
            if (item.isFixed) return true;
            return parseInt(item.month) === month && parseInt(item.year) === year;
        });

        console.log("\n--- Filtered for Feb 2026 ---");
        console.log(JSON.stringify(filtered, null, 2));

        const filteredJan = (user.salaryDeductionBreakdown || []).filter(item => {
            if (item.isFixed) return true;
            return parseInt(item.month) === 1 && parseInt(item.year) === 2026;
        });

        console.log("\n--- Filtered for Jan 2026 ---");
        console.log(JSON.stringify(filteredJan, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
