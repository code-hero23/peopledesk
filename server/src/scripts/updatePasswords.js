require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Generating bcrypt hash for password "admin123"...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        console.log('Hash generated successfully.');

        // 1. Update all existing employees/users passwords to 'admin123'
        console.log('Updating all existing employee passwords to "admin123"...');
        const updateResult = await prisma.user.updateMany({
            data: {
                password: hashedPassword
            }
        });
        console.log(`Successfully updated passwords for ${updateResult.count} users.`);

        // 2. Add or upsert admin user with 'admin@cookscape.com'
        console.log('Checking for admin user "admin@cookscape.com"...');
        const existingAdmin = await prisma.user.findUnique({
            where: { email: 'admin@cookscape.com' }
        });

        if (existingAdmin) {
            console.log('Admin user already exists. Updating password and ensuring role is ADMIN...');
            await prisma.user.update({
                where: { id: existingAdmin.id },
                data: {
                    password: hashedPassword,
                    role: 'ADMIN'
                }
            });
            console.log('Admin user updated successfully.');
        } else {
            console.log('Admin user does not exist. Creating new admin user...');
            const newAdmin = await prisma.user.create({
                data: {
                    name: 'Admin',
                    email: 'admin@cookscape.com',
                    password: hashedPassword,
                    role: 'ADMIN',
                    phone: '9999999999', // Default phone number placeholder
                    designation: 'ADMIN',
                    dateOfJoining: new Date(),
                    status: 'ACTIVE'
                }
            });
            console.log(`New admin user created successfully with ID: ${newAdmin.id}`);
        }

    } catch (error) {
        console.error('An error occurred during database migration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
