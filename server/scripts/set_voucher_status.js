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

    const voucherId = parseInt(args[0], 10);
    const newStatus = args[1].toUpperCase();

    // Validate the status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'WAITING', 'PAID'];
    
    if (!validStatuses.includes(newStatus)) {
        console.log(`❌ Invalid status: ${newStatus}`);
        console.log(`👉 Must be one of: ${validStatuses.join(', ')}`);
        process.exit(1);
    }

    if (isNaN(voucherId)) {
        console.log(`❌ Invalid voucher ID: ${args[0]}`);
        process.exit(1);
    }

    try {
        // Check if voucher exists first
        const existingVoucher = await prisma.voucher.findUnique({
            where: { id: voucherId }
        });

        if (!existingVoucher) {
            console.log(`❌ Voucher with ID ${voucherId} not found in the database.`);
            process.exit(1);
        }

        console.log(`⏳ Updating Voucher #${voucherId} from ${existingVoucher.status} to ${newStatus}...`);

        // Update the voucher status
        const updatedVoucher = await prisma.voucher.update({
            where: { id: voucherId },
            data: { status: newStatus }
        });

        console.log(`✅ Success! Voucher #${updatedVoucher.id} is now marked as: ${updatedVoucher.status}`);
        
    } catch (error) {
        console.error("❌ Error updating the voucher:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
