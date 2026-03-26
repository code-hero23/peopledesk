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
        // Use raw: false to get the formatted strings from Excel cells
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

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
            select: { id: true, name: true, role: true, designation: true, biometricId: true }
        });

        // Extremely robust fuzzy matcher for names and IDs
        const findUser = (name, bioId) => {
            // 1. Try matching by biometricId if provided
            if (bioId) {
                const idMatch = allUsers.find(u => u.biometricId === bioId.toString().trim());
                if (idMatch) return idMatch;
            }

            if (!name) return null;
            
            const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanInput = clean(name);
            if (!cleanInput) return null;

            // 2. Exact clean match
            let match = allUsers.find(u => clean(u.name) === cleanInput);
            if (match) return match;

            // 3. Word-based matching (Relaxed)
            const inputWords = name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
            
            match = allUsers.find(u => {
                const userWords = u.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
                
                // Does ANY input word share a 4-character prefix with ANY user word?
                return inputWords.some(iw => 
                    userWords.some(uw => {
                        const min = Math.min(iw.length, uw.length, 5); // Match at least 5 chars or full word
                        return iw.substring(0, min) === uw.substring(0, min) || 
                                uw.includes(iw) || iw.includes(uw);
                    })
                );
            });

            return match;
        };

        // Track seen users to delete their month data once
        const refreshedUsers = new Set();

        for (const [index, row] of data.entries()) {
            // Check if row is completely empty or just has whitespace
            const hasData = Object.values(row).some(v => v !== null && v !== undefined && v.toString().trim() !== '');
            if (!hasData) {
                // Skip completely empty rows silently
                continue;
            }

            const name = (row['First Name'] || row['Name'] || row['name'] || '').toString().trim();
            const dateVal = row['Date'];
            const firstPunchVal = row['First Punch'];
            const lastPunchVal = row['Last Punch'];

            // Individual field validation for better error reporting
            if (!name || !dateVal || !firstPunchVal) {
                const missing = [];
                if (!name) missing.push('Name');
                if (!dateVal) missing.push('Date');
                if (!firstPunchVal) missing.push('First Punch');
                
                results.failed++;
                results.errors.push(`Row ${index + 2}: Missing ${missing.join(', ')}`);
                continue;
            }

            const bioId = row['Biometric ID'] || row['biometric id'] || row['BiometricID'];
            const user = findUser(name, bioId);
            if (!user) {
                results.failed++;
                const errorMsg = bioId 
                    ? `Row ${index + 2}: No user found for name "${name}" or ID "${bioId}"`
                    : `Row ${index + 2}: No user found for name "${name}"`;
                results.errors.push(errorMsg);
                continue;
            }

            if (user.designation === 'AE') {
                results.skipped++;
                continue;
            }

            // Robust Date Parsing
            let day, month, year;
            const parseDate = (val) => {
                if (typeof val === 'number') {
                    const s = xlsx.SSF.parse_date_code(val);
                    return { d: s.d, m: s.m - 1, y: s.y };
                }
                if (val instanceof Date) {
                    return { d: val.getDate(), m: val.getMonth(), y: val.getFullYear() };
                }
                const s = val.toString().trim();
                // Try DD-MM-YYYY or DD/MM/YYYY
                const parts = s.split(/[-/]/);
                if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
                    let d = parseInt(parts[0]);
                    let m = parseInt(parts[1]) - 1;
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000; // Handle 2-digit years like '26'
                    return { d, m, y };
                }
                // Fallback to JS native parsing (e.g. "1-Mar-2026")
                const dObj = new Date(s);
                if (!isNaN(dObj.getTime())) {
                    let y = dObj.getFullYear();
                    if (y < 100) y += 2000;
                    return { d: dObj.getDate(), m: dObj.getMonth(), y };
                }
                return null;
            };

            const parsedDate = parseDate(dateVal);
            if (!parsedDate) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: Unrecognized date format "${dateVal}"`);
                continue;
            }
            ({ d: day, m: month, y: year } = parsedDate);

            // TOTAL REFRESH: Delete all biometric data for this user for the months being imported
            // Expanding range significantly to catch any "shifted" legacy data
            if (!refreshedUsers.has(user.id)) {
                const deleteResult = await prisma.biometricLog.deleteMany({
                    where: { userId: user.id }
                });
                results.deleted += deleteResult.count;
                refreshedUsers.add(user.id);
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
