const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to change the status of a voucher to PAID or WAITING (Not Paid)
 * Usage:
 * node set_voucher_status.js <VOUCHER_ID> <STATUS>
 * 
 * Example:
 * node set_voucher_status.js 140 PAID
 * node set_voucher_status.js 160 WAITING
 */

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log("❌ Missing arguments.");
        console.log("👉 Usage: node set_voucher_status.js <voucher_id> <PAID | WAITING>");
        console.log("👉 Example: node set_voucher_status.js 140 PAID");
        process.exit(1);
    }

    const idsArg = args[0];
    let newStatus = args[1].toUpperCase();

    // Map user-friendly "NOT_PAID" to the actual database status "APPROVED"
    if (newStatus === 'NOT_PAID') {
        newStatus = 'APPROVED';
    }

    // Validate the status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'WAITING', 'PAID'];
    
    if (!validStatuses.includes(newStatus)) {
        console.log(`❌ Invalid status: ${args[1]}`);
        console.log(`👉 Must be one of: ${validStatuses.join(', ')} or NOT_PAID`);
        process.exit(1);
    }

    // Parse comma-separated IDs
    const voucherIds = idsArg.split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

    if (voucherIds.length === 0) {
        console.log(`❌ Invalid voucher ID(s) provided: ${idsArg}`);
        process.exit(1);
    }

    try {
        console.log(`⏳ Updating ${voucherIds.length} Voucher(s) [${voucherIds.join(', ')}] to ${newStatus}...`);

        // Update multiple vouchers at once
        const result = await prisma.voucher.updateMany({
            where: { 
                id: { in: voucherIds } 
            },
            data: { status: newStatus }
        });

        console.log(`✅ Success! Updated ${result.count} voucher(s) to: ${newStatus}`);
        
    } catch (error) {
        console.error("❌ Error updating the vouchers:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
