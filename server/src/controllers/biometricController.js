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
        const data = xlsx.utils.sheet_to_json(sheet, { cellDates: true });

        // Cleanup temp file
        try {
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.error('Failed to delete temp file:', err);
        }

        if (data.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty' });
        }

        const results = { success: 0, failed: 0, skipped: 0, deleted: 0, errors: [] };

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

        // Track user-dates to delete existing data once per combo
        const processedCombos = new Set();

        for (const [index, row] of data.entries()) {
            // Updated columns based on sample: First Name, Date, First Punch, Last Punch
            const name = (row['First Name'] || row['Name'] || row['name'] || '').toString().trim();
            const dateVal = row['Date']; // May be a Date object or string
            const firstPunchVal = row['First Punch']; // May be a Date object or string
            const lastPunchVal = row['Last Punch']; // May be a Date object or string

            if (!name || !dateVal || !firstPunchVal) {
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

            // Parse Date
            let day, month, year;
            if (typeof dateVal === 'number' && !isNaN(dateVal)) {
                const serial = xlsx.SSF.parse_date_code(dateVal);
                day = serial.d;
                month = serial.m - 1;
                year = serial.y;
            } else if (dateVal instanceof Date) {
                day = dateVal.getDate();
                month = dateVal.getMonth();
                year = dateVal.getFullYear();
            } else {
                const dateStr = dateVal.toString().trim();
                const dateParts = dateStr.split(/[-/]/);
                if (dateParts.length !== 3) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: Invalid date format "${dateStr}" (Expected DD-MM-YYYY)`);
                    continue;
                }
                day = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1;
                year = parseInt(dateParts[2]);
            }

            // DELETE EXISTING DATA for this user on this date (Clean-Replace)
            const comboKey = `${user.id}-${year}-${month}-${day}`;
            if (!processedCombos.has(comboKey)) {
                const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
                const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59) - (5.5 * 60 * 60 * 1000));
                
                const deleteResult = await prisma.biometricLog.deleteMany({
                    where: {
                        userId: user.id,
                        punchTime: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    }
                });
                results.deleted += deleteResult.count;
                processedCombos.add(comboKey);
            }

            const createLog = async (val, type) => {
                if (!val || val === '--' || val === '00:00') return;
                
                let hour, min;
                if (typeof val === 'number') {
                    const serialTime = xlsx.SSF.parse_date_code(val);
                    hour = serialTime.H;
                    min = serialTime.M;
                } else if (val instanceof Date) {
                    hour = val.getHours();
                    min = val.getMinutes();
                } else {
                    const timeParts = val.toString().trim().split(':');
                    if (timeParts.length < 2) return;
                    hour = parseInt(timeParts[0]);
                    min = parseInt(timeParts[1]);
                }

                // IST Correction (-5:30)
                const punchTime = new Date(Date.UTC(year, month, day, hour, min) - (5.5 * 60 * 60 * 1000));

                if (isNaN(punchTime.getTime())) return;

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
                await createLog(firstPunchVal, 'IN');
                
                // Last Punch (OUT) - Compare HH:mm string to avoid Date instance mismatch
                const getHHMM = (v) => {
                    if (typeof v === 'number') {
                        const s = xlsx.SSF.parse_date_code(v);
                        return `${s.H}:${s.M}`;
                    }
                    if (v instanceof Date) return `${v.getHours()}:${v.getMinutes()}`;
                    return v.toString().trim();
                };

                if (lastPunchVal && getHHMM(lastPunchVal) !== getHHMM(firstPunchVal)) {
                    await createLog(lastPunchVal, 'OUT');
                }
            } catch (err) {
                console.error(`Error saving biometric record at row ${index + 2}:`, err);
                results.failed++;
                results.errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        res.json({
            message: `Biometric import complete.`,
            importedCount: results.success,
            skippedCount: results.skipped,
            failedCount: results.failed,
            unmatchedNames: results.errors // The frontend uses .length on this
        });

    } catch (error) {
        console.error('Biometric Import Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { importBiometricData };
