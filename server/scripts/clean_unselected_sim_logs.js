const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("--- Starting SIM Clean-up Script ---");
        
        // 1. Get all active enrolled devices to find the official SIM for each user
        const devices = await prisma.callSyncDevice.findMany({
            where: { active: true },
            include: { user: { select: { name: true } } }
        });

        console.log(`Found ${devices.length} active registered devices.`);
        
        // Map of userId -> officialSim
        const userSimMap = {};
        devices.forEach(d => {
            userSimMap[d.userId] = {
                officialSim: d.officialSim,
                name: d.user?.name || `User ID ${d.userId}`
            };
        });

        // 2. Fetch all call logs from the database
        const logs = await prisma.callLog.findMany();
        console.log(`Fetched ${logs.length} call log documents to review.`);

        let totalCleanedCalls = 0;
        let deletedDocumentsCount = 0;

        for (const log of logs) {
            const mapping = userSimMap[log.userId];
            if (!mapping) {
                console.log(`Skipping logs for User ID ${log.userId} (No active device registered).`);
                continue;
            }

            const { officialSim, name } = mapping;
            if (!officialSim || officialSim === '0') {
                console.log(`Skipping logs for ${name} (Official SIM is set to ALL or 0).`);
                continue;
            }

            const originalCalls = Array.isArray(log.calls) ? log.calls : [];
            if (originalCalls.length === 0) continue;

            // Filter out calls that don't match the official SIM slot index
            const filteredCalls = originalCalls.filter(c => {
                // If the call's simSlot is the official SIM, keep it.
                // If it resolves via standard 1-based format, match it.
                const slot = String(c.simSlot || '').trim();
                const targetSlot = String(officialSim).trim();
                
                if (slot && slot !== "0") {
                    return slot === targetSlot;
                }
                
                // Fallback to label check if slot index is not populated or "0"
                const label = String(c.simLabel || '').toLowerCase();
                if (targetSlot === '1' && (label.includes('sim 1') || label.includes('slot 1'))) return true;
                if (targetSlot === '2' && (label.includes('sim 2') || label.includes('slot 2'))) return true;

                return false;
            });

            const removedCount = originalCalls.length - filteredCalls.length;

            if (removedCount > 0) {
                console.log(`Deleting log for ${name} on date ${log.date.toISOString().split('T')[0]}: Found ${removedCount} unselected SIM calls.`);
                
                // Delete the document
                await prisma.callLog.delete({
                    where: { id: log.id }
                });

                totalCleanedCalls += removedCount;
                deletedDocumentsCount++;
            }
        }

        console.log(`\n--- Clean-up Summary ---`);
        console.log(`Successfully deleted ${deletedDocumentsCount} documents.`);
        console.log(`Deleted ${totalCleanedCalls} unselected SIM calls from database.`);
    } catch (e) {
        console.error("Error during execution:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
