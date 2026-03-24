const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const fs = require('fs');

// @desc    Import biometric (Face ID) data from Excel
// @route   POST /api/admin/attendance/biometric/import
// @access  Private (Admin)
const importBiometricData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an Excel file' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // Cleanup temp file
        try {
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.error('Failed to delete temp file:', err);
        }

        if (data.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty' });
        }

        const results = { success: 0, failed: 0, skipped: 0, errors: [] };

        // Pre-fetch users for fuzzy matching
        const allUsers = await prisma.user.findMany({
            select: { id: true, name: true, role: true, designation: true }
        });

        // Simple fuzzy matcher / normalizer
        const findUserByName = (name) => {
            if (!name) return null;
            const normalizedInput = name.toLowerCase().trim().replace(/\s+/g, ' ');

            // 1. Try exact match
            let match = allUsers.find(u => u.name.toLowerCase().trim() === normalizedInput);
            if (match) return match;

            // 2. Try partial match (if input is part of full name or vice versa)
            match = allUsers.find(u => 
                u.name.toLowerCase().includes(normalizedInput) || 
                normalizedInput.includes(u.name.toLowerCase())
            );
            if (match) return match;

            // 3. Fallback: Word match (check first name)
            const inputFirst = normalizedInput.split(' ')[0];
            match = allUsers.find(u => u.name.toLowerCase().split(' ')[0] === inputFirst);
            
            return match;
        };

        for (const [index, row] of data.entries()) {
            // Updated columns based on sample: First Name, Date, First Punch, Last Punch
            const name = (row['First Name'] || row['Name'] || row['name'] || '').toString().trim();
            const dateStr = (row['Date'] || '').toString().trim(); // DD-MM-YYYY
            const firstPunchStr = (row['First Punch'] || '').toString().trim(); // HH:mm
            const lastPunchStr = (row['Last Punch'] || '').toString().trim(); // HH:mm

            if (!name || !dateStr || !firstPunchStr) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: Missing Name, Date, or First Punch`);
                continue;
            }

            // Find user with fuzzy matching
            const user = findUserByName(name);

            if (!user) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: No user found for name "${name}"`);
                continue;
            }

            // EXCLUDE AEs
            if (user.designation === 'AE') {
                results.skipped++;
                continue;
            }

            // Parse Date: DD-MM-YYYY
            const dateParts = dateStr.split('-');
            if (dateParts.length !== 3) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: Invalid date format "${dateStr}" (Expected DD-MM-YYYY)`);
                continue;
            }
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const year = parseInt(dateParts[2]);

            const createLog = async (timeStr, type) => {
                if (!timeStr || timeStr === '--' || timeStr === '00:00') return;
                const timeParts = timeStr.split(':');
                const hour = parseInt(timeParts[0]);
                const min = parseInt(timeParts[1]);
                const punchTime = new Date(year, month, day, hour, min, 0);

                if (isNaN(punchTime.getTime())) return;

                // DUPLICATE PREVENTION: Check if this exact punch already exists
                const existing = await prisma.biometricLog.findFirst({
                    where: {
                        userId: user.id,
                        punchTime: punchTime
                    }
                });

                if (existing) {
                    results.skipped++;
                    return;
                }

                await prisma.biometricLog.create({
                    data: {
                        userId: user.id,
                        punchTime,
                        punchType: type,
                        deviceId: (row['Department'] || '').toString()
                    }
                });
                results.success++;
            };

            try {
                // First Punch (IN)
                await createLog(firstPunchStr, 'IN');
                
                // Last Punch (OUT) - Only if different and valid
                if (lastPunchStr && lastPunchStr !== firstPunchStr) {
                    await createLog(lastPunchStr, 'OUT');
                }
            } catch (err) {
                console.error(`Error saving biometric record at row ${index + 2}:`, err);
                results.failed++;
                results.errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        res.json({
            message: `Biometric import complete. Imported ${results.success} logs. Skipped ${results.skipped} (AEs). Failed ${results.failed}.`,
            details: results
        });

    } catch (error) {
        console.error('Biometric Import Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { importBiometricData };
