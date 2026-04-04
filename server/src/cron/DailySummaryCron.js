const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail } = require('../utils/emailService');

/**
 * Generates and sends a Daily Summary Report to HR
 * Scheduled for 08:00 PM IST (14:30 UTC)
 */
const initDailySummaryCron = () => {
    // 20:00 IST = 14:30 UTC
    cron.schedule('30 14 * * *', async () => {
        await generateAndSendDailySummary();
    });

    console.log('Daily Summary Report Cron Job Initialized (08:00 PM IST Daily)');
};

/**
 * Core logic to aggregate data and send email
 * Separated for manual trigger support
 */
const generateAndSendDailySummary = async () => {
    console.log('--------------------------------');
    console.log('Generating Daily HR Summary Report');
    console.log(new Date().toLocaleString());

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Fetch All Active Staff (Excluding ADMIN)
        const staff = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                role: { not: 'ADMIN' }
            },
            select: {
                id: true,
                name: true,
                designation: true,
                role: true
            }
        });

        // 2. Fetch Today's Attendance
        const attendanceRecs = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        // 3. Fetch Today's WorkLogs
        const workLogs = await prisma.workLog.findMany({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: {
                user: true
            }
        });

        // --- Aggregation logic ---
        const presentUserIds = new Set(attendanceRecs.map(a => a.userId));
        const presentStaff = staff.filter(s => presentUserIds.has(s.id));
        const absentStaff = staff.filter(s => !presentUserIds.has(s.id));

        // Designation Breakdown
        const designationsList = ['AE', 'FA', 'LA', 'OFFICE_ADMIN', 'CRE', 'HR', 'PURCHASE', 'ACCOUNTS'];
        const breakdown = {};
        designationsList.forEach(d => {
            const totalInDept = staff.filter(s => s.designation && s.designation.toUpperCase().includes(d)).length;
            const presentInDept = presentStaff.filter(s => s.designation && s.designation.toUpperCase().includes(d)).length;
            breakdown[d] = { total: totalInDept, present: presentInDept, absent: totalInDept - presentInDept };
        });

        // Mobile Logins
        const mobileLogins = attendanceRecs.filter(a => 
            (a.deviceInfo && /mobile|android|iphone|ios/i.test(a.deviceInfo)) ||
            (a.checkoutDeviceInfo && /mobile|android|iphone|ios/i.test(a.checkoutDeviceInfo))
        ).length;

        // Improper Logouts (Check-in exists, but checkoutTime is null)
        const improperLogouts = attendanceRecs.filter(a => !a.checkoutTime).length;

        // AE Sessions (WorkLogs for users with AE in designation)
        const aeWorkLogs = workLogs.filter(wl => wl.user.designation && wl.user.designation.toUpperCase().includes('AE'));
        const aeSessions = aeWorkLogs.length;

        // --- HTML Report Construction ---
        const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Daily HR Summary Report</h2>
                <p style="font-weight: bold; color: #7f8c8d;">Date: ${dateStr}</p>

                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #2980b9;">Overall Attendance</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 5px 0;">Total Staff (Active):</td><td style="font-weight: bold; text-align: right;">${staff.length}</td></tr>
                        <tr style="color: #27ae60;"><td style="padding: 5px 0;">Present:</td><td style="font-weight: bold; text-align: right;">${presentStaff.length}</td></tr>
                        <tr style="color: #e74c3c;"><td style="padding: 5px 0;">Absent:</td><td style="font-weight: bold; text-align: right;">${absentStaff.length}</td></tr>
                    </table>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2980b9;">Designation Breakdown</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #ecf0f1; border-bottom: 2px solid #bdc3c7;">
                                <th style="padding: 8px; text-align: left;">Dept</th>
                                <th style="padding: 8px; text-align: center;">Total</th>
                                <th style="padding: 8px; text-align: center;">Present</th>
                                <th style="padding: 8px; text-align: center;">Absent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(breakdown).map(d => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px; font-weight: bold;">${d}</td>
                                    <td style="padding: 8px; text-align: center;">${breakdown[d].total}</td>
                                    <td style="padding: 8px; text-align: center; color: #27ae60;">${breakdown[d].present}</td>
                                    <td style="padding: 8px; text-align: center; color: #e74c3c;">${breakdown[d].absent}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="background-color: #fff9db; padding: 20px; border-radius: 10px; border: 1px solid #ffe066;">
                    <h3 style="margin-top: 0; color: #f08c00;">Operational Insights</h3>
                    <ul style="padding-left: 20px; margin: 0;">
                        <li><strong>AE Sessions Completed:</strong> ${aeSessions}</li>
                        <li><strong>WorkLogs Submitted:</strong> ${workLogs.length}</li>
                        <li><strong>Mobile Logins:</strong> ${mobileLogins}</li>
                        <li style="color: #e03131;"><strong>Improper Logouts (Missing Checkout):</strong> ${improperLogouts}</li>
                    </ul>
                </div>

                <p style="font-size: 12px; color: #95a5a6; margin-top: 30px; text-align: center;">
                    This is an automated report generated by the PeopleDesk System.
                </p>
            </div>
        `;

        const mailSent = await sendEmail({
            to: 'es.cookscape@gmail.com',
            subject: `Daily PeopleDesk Summary - ${dateStr}`,
            html: html
        });

        return mailSent;

    } catch (error) {
        console.error('CRON ERROR in Daily Summary Report:', error);
        throw error;
    }
};

module.exports = {
    initDailySummaryCron,
    generateAndSendDailySummary
};
