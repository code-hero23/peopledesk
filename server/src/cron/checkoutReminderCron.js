const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('../utils/emailService');
const { getStartOfDayIST, getEndOfDayIST } = require('../utils/dateHelpers');
const prisma = new PrismaClient();

const initCheckoutReminderCron = () => {
    // Run every day at 23:30 (11:30 PM)
    cron.schedule('30 23 * * *', async () => {
        console.log('--------------------------------');
        console.log('Running 11:30 PM Checkout Reminder Cron Job');
        console.log(new Date().toLocaleString());

        try {
            // Get start and end of today in IST
            const startOfDay = getStartOfDayIST();
            const endOfDay = getEndOfDayIST();

            // Fetch attendance records from today where checkoutTime is null
            const incompleteAttendances = await prisma.attendance.findMany({
                where: {
                    date: { gte: startOfDay, lte: endOfDay },
                    checkoutTime: null
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, status: true }
                    }
                }
            });

            if (incompleteAttendances.length === 0) {
                console.log('All employees have checked out today. No emails to send.');
                return;
            }

            console.log(`Found ${incompleteAttendances.length} employees who haven't checked out.`);

            let emailsSent = 0;
            for (const record of incompleteAttendances) {
                // Ensure user status is active and email exists
                if (record.user && record.user.status === 'ACTIVE' && record.user.email) {

                    const emailBody = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                            <h2 style="color: #dc2626; border-bottom: 2px solid #fee2e2; padding-bottom: 10px;">Action Required: Logout Not Recorded</h2>
                            <p>Hello <b>${record.user.name}</b>,</p>
                            
                            <p>Today, it has been noticed that your logout was not properly recorded in PeopleDesk.</p>
                            
                            <p>Please note that regular login and logout are mandatory for attendance and salary processing. Missing logout entries may lead to salary deduction as per company policy.</p>
                            
                            <p>Kindly ensure proper logout in PeopleDesk every day by <b>11:59 PM</b> to avoid such issues in the future. If you are still working, you may ignore this message until your shift ends.</p>
                            
                            <p>If you believe this is an error or require any clarification, please contact the HR team immediately.</p>
                            
                            <p>Thank you for your cooperation.</p>
                            
                            <br/>
                            <p style="margin-bottom: 0;">Regards,</p>
                            <p style="margin-top: 0; font-weight: bold; color: #1e3a8a;">HR Team<br/>Cookscape</p>
                        </div>
                    `;

                    // Send the email
                    const success = await sendEmail({
                        to: record.user.email,
                        subject: 'Action Required: Logout Not Recorded Today in PeopleDesk',
                        html: emailBody
                    });

                    if (success) {
                        emailsSent++;
                    }
                }
            }

            console.log(`Successfully sent ${emailsSent} reminder emails.`);

        } catch (error) {
            console.error('Error in Checkout Reminder Cron:', error);
        }
    });

    console.log('Checkout Reminder Cron Job Initialized (Runs daily at 11:30 PM)');
};

module.exports = initCheckoutReminderCron;
