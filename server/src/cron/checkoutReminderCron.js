const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getStartOfDayIST, getEndOfDayIST } = require('../utils/dateHelpers');
const { sendEmail } = require('../utils/emailService');

const initCheckoutReminderCron = () => {
    // @desc    Reminder to Checkout (Daily at 11:30 PM IST)
    // Runs at 23:30 (11:30 PM) for users who haven't checked out
    cron.schedule('30 23 * * *', async () => {
        console.log('CRON: Running Checkout Reminder Job [11:30 PM IST]...');

        try {
            const start = getStartOfDayIST();
            const end = getEndOfDayIST();

            console.log(`CRON: Checking attendance range: ${start.toISOString()} - ${end.toISOString()}`);

            const incompleteAttendance = await prisma.attendance.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end,
                    },
                    checkoutTime: null,
                    status: 'PRESENT',
                },
                include: {
                    user: true,
                },
            });

            console.log(`CRON: Found ${incompleteAttendance.length} users who haven't checked out.`);

            for (const record of incompleteAttendance) {
                const user = record.user;
                if (!user.email) {
                    console.log(`CRON: Skipping user ${user.name} - No email configured.`);
                    continue;
                }

                const mailContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    <h2 style="color: #dc2626; border-bottom: 2px solid #fee2e2; padding-bottom: 10px;">Logout Warning!</h2>
                    <p>Hi <strong>${user.name}</strong>,</p>
                    <p>Our records show that you have not checked out for today (<strong>${new Date().toLocaleDateString('en-IN')}</strong>).</p>
                    <p>Please log in to the PeopleDesk portal and mark your check-out to avoid attendance discrepancies.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #777;">This is an automated reminder. If you have already checked out, please ignore this email.</p>
                </div>
            `;

                try {
                    const emailSent = await sendEmail({
                        to: user.email,
                        subject: 'Action Required: Daily Logout Reminder',
                        html: mailContent
                    });

                    if (emailSent) {
                        console.log(`CRON: Email sent successfully to ${user.email} (${user.name})`);
                    }

                    // Trigger WhatsApp Notification
                    try {
                        const whatsAppService = require('../utils/WhatsAppService');
                        if (user.phone) {
                            await whatsAppService.sendMissedLogoutNotification(user.phone, user.name);
                        }
                    } catch (wsError) {
                        console.error('CRON: Error sending WhatsApp logout alert:', wsError);
                    }
                } catch (emailError) {
                    console.error(`CRON: SMTP Error for ${user.email}:`, emailError.message);
                }
            }

            console.log('CRON: Checkout Reminder Job completed.');
        } catch (error) {
            console.error('CRON FATAL: Error in checkoutReminderCron:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('Checkout Reminder Cron Job Initialized');
};

module.exports = initCheckoutReminderCron;
