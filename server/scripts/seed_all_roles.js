const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Seeding/Creating Users for All Roles...');

    const salt = await bcrypt.genSalt(10);

    // 1. Admin
    const adminPass = await bcrypt.hash('admin123', salt);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cookscape.com' },
        update: {
            password: adminPass,
            role: 'ADMIN',
            status: 'ACTIVE'
        },
        create: {
            name: 'Super Admin',
            email: 'admin@cookscape.com',
            password: adminPass,
            role: 'ADMIN',
            designation: 'ADMIN',
            status: 'ACTIVE'
        }
    });
    console.log(`✅ Admin: ${admin.email}`);

    // 2. Business Head (BH)
    const bhPass = await bcrypt.hash('bh@123', salt);
    const bh = await prisma.user.upsert({
        where: { email: 'bh@cookscape.com' },
        update: {
            password: bhPass,
            role: 'BUSINESS_HEAD',
            isGlobalAccess: true,
            status: 'ACTIVE'
        },
        create: {
            name: 'Business Head',
            email: 'bh@cookscape.com',
            password: bhPass,
            role: 'BUSINESS_HEAD',
            designation: 'BH',
            isGlobalAccess: true,
            status: 'ACTIVE'
        }
    });
    console.log(`✅ Business Head: ${bh.email}`);

    // 3. HR
    const hrPass = await bcrypt.hash('hr@123', salt);
    const hr = await prisma.user.upsert({
        where: { email: 'hr@cookscape.com' },
        update: {
            password: hrPass,
            role: 'HR',
            status: 'ACTIVE'
        },
        create: {
            name: 'HR Manager',
            email: 'hr@cookscape.com',
            password: hrPass,
            role: 'HR',
            designation: 'HR',
            status: 'ACTIVE'
        }
    });
    console.log(`✅ HR: ${hr.email}`);

    // 4. Accounts Manager
    const accountsPass = await bcrypt.hash('accounts@123', salt);
    const accounts = await prisma.user.upsert({
        where: { email: 'accounts@cookscape.com' },
        update: {
            password: accountsPass,
            role: 'ACCOUNTS_MANAGER',
            status: 'ACTIVE'
        },
        create: {
            name: 'Accounts Manager',
            email: 'accounts@cookscape.com',
            password: accountsPass,
            role: 'ACCOUNTS_MANAGER',
            designation: 'ACCOUNTS_MANAGER',
            status: 'ACTIVE'
        }
    });
    console.log(`✅ Accounts Manager: ${accounts.email}`);

    // 5. AE Manager
    const aePass = await bcrypt.hash('ae@123', salt);
    const aeManager = await prisma.user.upsert({
        where: { email: 'aemanager@cookscape.com' },
        update: {
            password: aePass,
            role: 'AE_MANAGER',
            status: 'ACTIVE'
        },
        create: {
            name: 'AE Manager',
            email: 'aemanager@cookscape.com',
            password: aePass,
            role: 'AE_MANAGER',
            designation: 'AE_MANAGER',
            status: 'ACTIVE'
        }
    });
    console.log(`✅ AE Manager: ${aeManager.email}`);

    // 6. Standard Employee (reporting to BH)
    const empPass = await bcrypt.hash('employee123', salt);
    const emp = await prisma.user.upsert({
        where: { email: 'employee@cookscape.com' },
        update: {
            password: empPass,
            role: 'EMPLOYEE',
            reportingBhId: bh.id,
            status: 'ACTIVE'
        },
        create: {
            name: 'John Doe',
            email: 'employee@cookscape.com',
            password: empPass,
            role: 'EMPLOYEE',
            designation: 'LA',
            reportingBhId: bh.id,
            status: 'ACTIVE'
        }
    });
    console.log(`✅ Employee: ${emp.email} (Reporting to BH ID: ${bh.id})`);

    // 7. Department Employees (password: employee@123)
    const deptPass = await bcrypt.hash('employee@123', salt);
    const designations = [
        { label: "Office Administration", value: "OFFICE-ADMINISTRATION", email: "admin01@cookscape.com", role: "ADMIN" },
        { label: "IT (DEVELOPMENT)", value: "IT (DEVELOPMENT)", email: "it@cookscape.com", role: "ADMIN" },
        { label: "Account", value: "ACCOUNT", email: "account@cs.com" },
        { label: "Lead Operation", value: "LEAD-OPERATION", email: "leadop@cs.com" },
        { label: "Lead Conversion", value: "LEAD-CONVERSION", email: "leadconv@cs.com" },
        { label: "Digital Marketing", value: "DIGITAL-MARKETING", email: "digital@cs.com" },
        { label: "Vendor Management", value: "VENDOR-MANAGEMENT", email: "vendor@cs.com" },
        { label: "Customer Relationship", value: "CUSTOMER-RELATIONSHIP", email: "custrel@cs.com" },
        { label: "Client Care", value: "CLIENT-CARE", email: "clientcare@cs.com" },
        { label: "Escalation", value: "ESCALATION", email: "escalation@cs.com" },
        { label: "Client Facilitator", value: "CLIENT-FACILITATOR", email: "facilitator@cs.com" }
    ];

    for (const d of designations) {
        await prisma.user.upsert({
            where: { email: d.email },
            update: {
                password: deptPass,
                role: d.role || 'EMPLOYEE',
                designation: d.value,
                reportingBhId: bh.id,
                status: 'ACTIVE'
            },
            create: {
                name: d.label,
                email: d.email,
                password: deptPass,
                role: d.role || 'EMPLOYEE',
                designation: d.value,
                reportingBhId: bh.id,
                status: 'ACTIVE'
            }
        });
        console.log(`✅ Department User: ${d.email} (${d.label})`);
    }

    console.log('\n🎉 All users have been created successfully!');
}

main()
    .catch((err) => {
        console.error('Error seeding users:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
