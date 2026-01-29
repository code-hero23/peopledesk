const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const prisma = new PrismaClient();

async function exportLatestEmployee() {
    try {
        // Find the user with designation OFFICE-ADMINISTRATION created most recently
        const employee = await prisma.user.findFirst({
            where: {
                designation: 'OFFICE-ADMINISTRATION'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!employee) {
            console.log("No OFFICE-ADMINISTRATION employee found.");
            return;
        }

        console.log("Found Employee:", employee.name);

        const data = [
            {
                Name: employee.name,
                Email: employee.email,
                Role: employee.role,
                Designation: employee.designation,
                Password: '***' // Placeholder for security
            }
        ];

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Employees');

        const fileName = `New_Employee_${employee.name.replace(/\s+/g, '_')}.xlsx`;
        const outputPath = path.join(__dirname, '..', '..', fileName); // Save to root project dir

        xlsx.writeFile(workbook, outputPath);

        console.log(`Excel file created at: ${outputPath}`);

    } catch (error) {
        console.error("Error exporting employee:", error);
    } finally {
        await prisma.$disconnect();
    }
}

exportLatestEmployee();
