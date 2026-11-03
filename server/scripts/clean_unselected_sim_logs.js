const prisma = require('../src/config/prisma');

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
                console.log(`No active device for User ID ${log.userId}. Deleting its log.`);
                await prisma.callLog.delete({ where: { id: log.id } });
                deletedDocumentsCount++;
                continue;
            }

            const { officialSim, name } = mapping;
            if (!officialSim || officialSim === '0') {
                console.log(`Official SIM for ${name} is unset or ALL. Deleting its log.`);
                await prisma.callLog.delete({ where: { id: log.id } });
                deletedDocumentsCount++;
                continue;
            }

            const originalCalls = Array.isArray(log.calls) ? log.calls : [];
            if (originalCalls.length === 0) continue;



            // Filter out calls that don't match the official SIM slot index or carrier
            const filteredCalls = originalCalls.filter(c => {
                const targetSlot = String(officialSim).trim().toLowerCase();
                const isCarrier = targetSlot.match(/[a-z]/i) && !targetSlot.startsWith('sim') && !targetSlot.startsWith('slot');
                const label = String(c.simLabel || '').toLowerCase();

                if (isCarrier) {
                    const clean = targetSlot.replace(/^(sim|slot)\s*\d*\s*[-:]*\s*/i, '').trim();
                    const isVi = clean.includes('vi') || clean.includes('vodafone') || clean.includes('idea');
                    let matches = false;
                    if (isVi) {
                        matches = label.includes('vi') || label.includes('vodafone') || label.includes('idea');
                    } else {
                        matches = Boolean(label && (label.includes(clean) || clean.includes(label)));
                    }
                    if (!matches) return false;

                    // Also filter out calls outside 09:30 AM - 07:45 PM IST
                    if (c.date) {
                        const raw = Number(c.date);
                        if (!isNaN(raw) && raw > 0) {
                            const ms = raw < 10000000000 ? raw * 1000 : raw;
                            const d = new Date(ms + 5.5 * 60 * 60 * 1000);
                            const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
                            if (mins < 570 || mins > 1185) return false;
                        }
                    }
                    return true;
                }

                // If the call's simSlot is the official SIM, keep it.
                const slot = String(c.simSlot || '').trim();
                if (slot && slot !== "0") {
                    return slot === targetSlot;
                }
                
                // Fallback to label check if slot index is not populated or "0"
                if (targetSlot === '1' && (label.includes('sim 1') || label.includes('slot 1'))) return true;
                if (targetSlot === '2' && (label.includes('sim 2') || label.includes('slot 2'))) return true;

                return false;
            });

            const removedCount = originalCalls.length - filteredCalls.length;

            if (filteredCalls.length === 0) {
                // No calls match the official SIM – delete the whole log
                console.log(`No calls match official SIM for ${name}. Deleting entire log.`);
                await prisma.callLog.delete({ where: { id: log.id } });
                deletedDocumentsCount++;
                totalCleanedCalls += originalCalls.length;
                continue;
            }

            if (removedCount > 0) {
                // Some unselected calls were removed – update the document
                console.log(`Cleaning log for ${name} on date ${log.date.toISOString().split('T')[0]}: Keeping ${filteredCalls.length} calls (Removed ${removedCount} unselected SIM calls).`);
                await prisma.callLog.update({
                    where: { id: log.id },
                    data: {
                        calls: filteredCalls,
                        totalCalls: filteredCalls.length
                    }
                });
                totalCleanedCalls += removedCount;
                // Count as an updated document (not a full delete)
                // (optional – you can track separate counters if needed)
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
