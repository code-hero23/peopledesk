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
        const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

        // Cleanup temp file
        try {
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.error('Failed to delete temp file:', err);
        }

        if (rawRows.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty' });
        }

        let data = [];
        // Detect format: Search for 'Employee Name :' in the first 20 rows of the sheet
        let isBlockFormat = false;
        for (let i = 0; i < Math.min(20, rawRows.length); i++) {
            const firstCell = rawRows[i] && rawRows[i][0] ? rawRows[i][0].toString() : '';
            if (firstCell.includes('Employee Name :')) {
                isBlockFormat = true;
                break;
            }
        }

        if (isBlockFormat) {
            let currentEmployeeName = null;
            let currentBiometricId = null;
            let inDataSection = false;

            for (const row of rawRows) {
                if (!row || row.length === 0) continue;
                const firstCell = row[0] ? row[0].toString().trim() : '';

                if (firstCell.includes('Employee Name :')) {
                    const nameMatch = firstCell.match(/Employee Name\s*:\s*([^,]+)/);
                    const idMatch = firstCell.match(/Employee ID\s*:\s*([^,]+)/);
                    currentEmployeeName = nameMatch ? nameMatch[1].trim() : null;
                    currentBiometricId = idMatch ? idMatch[1].trim() : null;
                    inDataSection = false;
                } else if (firstCell === 'No.') {
                    inDataSection = true;
                } else if (inDataSection) {
                    if (firstCell === 'Total' || firstCell === '') {
                        inDataSection = false;
                    } else {
                        // This is a record row
                        const dateVal = row[1];
                        const firstPunchVal = row[3];
                        const lastPunchVal = row[4];
                        
                        if (dateVal) {
                            data.push({
                                'First Name': currentEmployeeName,
                                'Biometric ID': currentBiometricId,
                                'Date': dateVal,
                                'First Punch': firstPunchVal,
                                'Last Punch': lastPunchVal
                            });
                        }
                    }
                }
            }
        } else {
            // Standard flat layout
            data = xlsx.utils.sheet_to_json(sheet, { raw: false });
        }

        if (data.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty or contains no valid records' });
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

            // 3. Exact match after removing single-letter initials/titles
            const cleanInitials = (s) => {
                return s.toLowerCase()
                    .split(/[^a-z0-9]+/)
                    .filter(w => w.length > 1)
                    .join('');
            };
            const cleanInputInitials = cleanInitials(name);
            if (cleanInputInitials) {
                match = allUsers.find(u => cleanInitials(u.name) === cleanInputInitials);
                if (match) return match;
            }

            // 4. Word-based matching (Relaxed)
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
        const unmatchedEmployees = new Set();

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
                unmatchedEmployees.add(bioId ? `${name} (ID: ${bioId})` : name);
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
                // Try DD-MM-YYYY or YYYY-MM-DD or DD/MM/YYYY
                const parts = s.split(/[-/]/);
                if (parts.length === 3) {
                    let p0 = parseInt(parts[0], 10);
                    let p1 = parseInt(parts[1], 10);
                    let p2 = parseInt(parts[2], 10);
                    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
                        let d, m, y;
                        if (p0 > 31) {
                            // YYYY-MM-DD
                            y = p0;
                            m = p1 - 1;
                            d = p2;
                        } else {
                            // DD-MM-YYYY
                            d = p0;
                            m = p1 - 1;
                            y = p2;
                        }
                        if (y < 100) y += 2000; // Handle 2-digit years like '26'
                        return { d, m, y };
                    }
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

            // Universal time parser supporting: "10:35", "10.35", "10.2" (10:20), 10.35 (number), "10", 10
            const parseTime = (val) => {
                if (val === null || val === undefined) return null;
                if (val === '--' || val === '00:00' || val === '0.00' || val === 0) return null;

                let hour, min;
                if (typeof val === 'number') {
                    if (val > 0 && val < 1.0) {
                        // Excel serial time fraction (e.g. 0.4375 => 10:30)
                        const serialTime = xlsx.SSF.parse_date_code(val);
                        hour = serialTime.H;
                        min = serialTime.M;
                    } else {
                        // Numeric decimal format (e.g. 10.35 => 10:35, 10.2 => 10:20, 17 => 17:00)
                        hour = Math.floor(val);
                        min = Math.round((val - hour) * 100);
                    }
                } else if (val instanceof Date) {
                    hour = val.getHours();
                    min = val.getMinutes();
                } else {
                    const str = val.toString().trim();
                    if (!str || str === '--' || str === '00:00' || str === '0.00' || str === '0') return null;

                    if (str.includes(':')) {
                        const parts = str.split(':');
                        hour = parseInt(parts[0], 10);
                        min = parseInt(parts[1] || '0', 10);
                    } else if (str.includes('.')) {
                        const parts = str.split('.');
                        hour = parseInt(parts[0], 10);
                        // "10.2" -> 20 mins, "10.05" -> 5 mins, "10.35" -> 35 mins
                        const minRaw = (parts[1] || '0').padEnd(2, '0').slice(0, 2);
                        min = parseInt(minRaw, 10);
                    } else if (!isNaN(parseInt(str, 10))) {
                        hour = parseInt(str, 10);
                        min = 0;
                    } else {
                        return null;
                    }
                }

                if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
                    return null;
                }

                return {
                    hour,
                    min,
                    formatted: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
                };
            };

            const createLog = async (parsed, type) => {
                if (!parsed) return;
                const { hour, min } = parsed;

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
                const firstParsed = parseTime(firstPunchVal);
                const lastParsed = parseTime(lastPunchVal);

                // First Punch (IN)
                if (firstParsed) {
                    await createLog(firstParsed, 'IN');
                }

                // Last Punch (OUT) - compare formatted HH:mm to avoid duplicate punches
                if (lastParsed && (!firstParsed || lastParsed.formatted !== firstParsed.formatted)) {
                    await createLog(lastParsed, 'OUT');
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
            unmatchedNames: results.errors, // The frontend uses .length on this
            unmatchedEmployees: Array.from(unmatchedEmployees)
        });

    } catch (error) {
        console.error('Biometric Import Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { importBiometricData };
