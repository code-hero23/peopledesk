
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

async function testLogin() {
    try {
        console.log("Simulating Login for cre@cs.com...");
        const user = await prisma.user.findUnique({
            where: { email: 'cre@cs.com' }
        });

        if (!user) {
            console.log("User not found");
            return;
        }

        console.log("User found, comparing password...");
        // Assuming we don't know the plain password, we just test the compare function with a dummy
        // But better: let's see if generateToken fails
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });
        console.log("Token generation successful:", token.slice(0, 10) + "...");

        const responseData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            designation: user.designation,
            reportingBhId: user.reportingBhId,
            isGlobalAccess: user.isGlobalAccess,
            token: token,
        };
        console.log("Response data structure created successfully");

    } catch (e) {
        console.error("Login Simulation Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testLogin();
