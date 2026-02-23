const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    console.log('🚀 Starting Test Data Creation...');

    // 1. Create/Update Dummy Employee
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'dummy@gmail.com' },
        update: {
            allocatedSalary: 30000,
            status: 'ACTIVE',
            role: 'EMPLOYEE',
            designation: 'AE'
        },
        create: {
            name: 'Dummy Test Employee',
            email: 'dummy@gmail.com',
            password: hashedPassword,
            allocatedSalary: 30000,
            status: 'ACTIVE',
            role: 'EMPLOYEE',
            designation: 'AE'
        }
    });

    console.log(`✅ User ${user.email} created/updated.`);

    // 2. Clear existing records for this user to avoid conflicts
    await prisma.attendance.deleteMany({ where: { userId: user.id } });
    await prisma.leaveRequest.deleteMany({ where: { userId: user.id } });
    await prisma.permissionRequest.deleteMany({ where: { userId: user.id } });

    // 3. Create 24 Attendance Records (within cycle Jan 26 - Feb 25)
    // We'll simulate 24 days of present records from Jan 26 onwards
    const attendanceRecords = [];
    let currentDate = new Date(2026, 0, 26); // Jan 26, 2026

    for (let i = 0; i < 24; i++) {
        // Skip Sundays for a bit of realism
        while (currentDate.getDay() === 0) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const date = new Date(currentDate);
        const checkin = new Date(date);
        checkin.setHours(9, 30, 0, 0); // 9:30 AM

        const checkout = new Date(date);
        checkout.setHours(18, 30, 0, 0); // 18:30 PM (9 hours)

        attendanceRecords.push({
            userId: user.id,
            date: checkin, // date is the check-in time in this schema
            status: 'PRESENT',
            checkoutTime: checkout,
            checkInPhoto: '/defaults/checkin.jpg',
            checkoutPhoto: '/defaults/checkout.jpg'
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    await prisma.attendance.createMany({ data: attendanceRecords });
    console.log(`✅ Created 24 attendance records.`);

    // 4. Create 4 Approved Leave Requests
    const leaveRequests = [];
    const leaveStartDate = new Date(2026, 1, 20); // Feb 20
    for (let i = 0; i < 4; i++) {
        const d = new Date(leaveStartDate);
        d.setDate(d.getDate() + i);
        leaveRequests.push({
            userId: user.id,
            startDate: d,
            endDate: d,
            type: 'SICK',
            reason: 'Testing Payroll',
            status: 'APPROVED',
            bhStatus: 'APPROVED',
            hrStatus: 'APPROVED'
        });
    }
    await prisma.leaveRequest.createMany({ data: leaveRequests });
    console.log(`✅ Created 4 approved leave records.`);

    // 5. Create 3 Approved Permissions (6 hours total @ 2hrs each)
    const permissionRequests = [];
    const permDate = new Date(2026, 1, 10); // Feb 10
    for (let i = 0; i < 3; i++) {
        const d = new Date(permDate);
        d.setDate(d.getDate() + i);
        permissionRequests.push({
            userId: user.id,
            date: d,
            startTime: '09:30 AM',
            endTime: '11:30 AM',
            reason: 'Testing Payroll',
            status: 'APPROVED',
            bhStatus: 'APPROVED',
            hrStatus: 'APPROVED'
        });
    }
    await prisma.permissionRequest.createMany({ data: permissionRequests });
    console.log(`✅ Created 3 approved permission records.`);

    console.log('\n✨ DONE! You can now generate the Payroll Report for Feb 2026.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
