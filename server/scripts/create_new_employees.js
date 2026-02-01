const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const designations = [
    { label: "Office Administration", value: "OFFICE-ADMINISTRATION", email: "office@cs.com" },
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

async function createEmployees() {
    console.log("Creating employees for new designations...");
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash("employee@123", salt);

    for (const d of designations) {
        try {
            const exists = await prisma.user.findUnique({ where: { email: d.email } });
            if (exists) {
                console.log(`User ${d.email} already exists.`);
                continue;
            }

            const user = await prisma.user.create({
                data: {
                    name: d.label,
                    email: d.email,
                    password: password,
                    role: 'EMPLOYEE',
                    designation: d.value,
                    status: 'ACTIVE'
                }
            });
            console.log(`Created: ${user.name} (${user.designation}) - ${user.email}`);
        } catch (e) {
            console.error(`Failed to create ${d.email}:`, e.message);
        }
    }
    console.log("\nDone. Password for all is 'employee@123'");
    await prisma.$disconnect();
}

createEmployees();
