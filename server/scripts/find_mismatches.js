const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

async function findMismatches() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: node scripts/find_mismatches.js <path-to-excel-file>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
    }

    try {
        console.log('--- Fetching users from database ---');
        const allUsers = await prisma.user.findMany({
            select: { id: true, name: true, role: true, designation: true, biometricId: true }
        });
        console.log(`Found ${allUsers.length} users in database.\n`);

        console.log('--- Reading Excel file ---');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });
        console.log(`Analyzing ${data.length} rows in "${sheetName}"...\n`);

        const findUser = (name, bioId) => {
            if (bioId) {
                const idMatch = allUsers.find(u => u.biometricId === bioId.toString().trim());
                if (idMatch) return idMatch;
            }
            if (!name) return null;
            const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanInput = clean(name);
            if (!cleanInput) return null;
            let match = allUsers.find(u => clean(u.name) === cleanInput);
            if (match) return match;
            const inputWords = name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
            match = allUsers.find(u => {
                const userWords = u.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
                return inputWords.some(iw => 
                    userWords.some(uw => {
                        const min = Math.min(iw.length, uw.length, 5);
                        return iw.substring(0, min) === uw.substring(0, min) || 
                                uw.includes(iw) || iw.includes(uw);
                    })
                );
            });
            return match;
        };

        const mismatches = [];
        const uniqueExcelNames = new Set();

        for (const [index, row] of data.entries()) {
            const hasData = Object.values(row).some(v => v !== null && v !== undefined && v.toString().trim() !== '');
            if (!hasData) continue;

            const name = (row['First Name'] || row['Name'] || row['name'] || '').toString().trim();
            const bioId = row['Biometric ID'] || row['biometric id'] || row['BiometricID'];

            if (!name && !bioId) continue;
            
            const identifier = name || `ID:${bioId}`;
            if (uniqueExcelNames.has(identifier)) continue;
            uniqueExcelNames.add(identifier);

            const user = findUser(name, bioId);
            if (!user) {
                mismatches.push({
                    row: index + 2,
                    name: name || 'N/A',
                    biometricId: bioId || 'N/A'
                });
            }
        }

        if (mismatches.length === 0) {
            console.log('✅ Success! All names/IDs in the Excel file matched with users in the database.');
        } else {
            console.log(`❌ Found ${mismatches.length} unmatched entries:`);
            console.table(mismatches);
            console.log('\nTip: Add these employees to the system or update their names to match the database.');
        }

    } catch (error) {
        console.error('Error during analysis:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

findMismatches();
