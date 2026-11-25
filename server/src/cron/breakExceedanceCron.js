const cron = require('node-cron');
const prisma = require('../config/prisma');
const whatsappService = require('../utils/WhatsAppService');
const { sendEmail } = require('../utils/emailService');

const ADMIN_ALERT_PHONE = process.env.BREAK_ALERT_PHONE || '9092705679';
const ADMIN_ALERT_EMAIL = process.env.BREAK_ALERT_EMAIL || 'es.cookscape@gmail.com';

// Format time in Indian Standard Time (IST)
const formatISTTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const formatISTDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Checks and sends break exceedance alerts for a scheduled slot.
 * @param {'TEA_1' | 'LUNCH' | 'TEA_2'} breakCategory 
 * @param {1 | 2} alertNum 1 for 1st alert, 2 for 2nd reminder
 */
const checkAndSendScheduledBreakAlert = async (breakCategory, alertNum) => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let breakLabel = '';
    let allowedLimit = 0;
    let threshold = 0; // Internal threshold: limit + 2m grace

    if (breakCategory === 'TEA_1') {
        breakLabel = 'Tea Break 1';
        allowedLimit = 15;
        threshold = 17;
    } else if (breakCategory === 'LUNCH') {
        breakLabel = 'Lunch Break';
        allowedLimit = 45;
        threshold = 47;
    } else if (breakCategory === 'TEA_2') {
        breakLabel = 'Tea Break 2';
        allowedLimit = 15;
        threshold = 17;
    }

    console.log(`[BreakCron] Running ${breakLabel} (${alertNum === 1 ? '1st Alert' : '2nd Reminder'})...`);

    try {
        // Find all active breaks today (breaks without endTime)
        const activeBreaks = await prisma.breakLog.findMany({
            where: {
                endTime: null,
                startTime: { gte: today },
                breakType: breakCategory === 'LUNCH' ? 'LUNCH' : 'TEA'
            },
            include: {
                attendance: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // "if nobody is there dont send"
        if (activeBreaks.length === 0) {
            console.log(`[BreakCron] No active ${breakCategory} breaks found. "if nobody is there dont send". Skipping.`);
            return;
        }

        const exceededList = [];

        for (const b of activeBreaks) {
            const user = b.attendance?.user;
            if (!user) continue;

            const startTime = new Date(b.startTime);
            const durationMinutes = Math.round((now - startTime) / 60000);

            // For TEA breaks, determine whether this is Tea 1 or Tea 2 for this user today
            if (breakCategory === 'TEA_1' || breakCategory === 'TEA_2') {
                const startOfDay = new Date(startTime);
                startOfDay.setHours(0, 0, 0, 0);

                const priorTeaCount = await prisma.breakLog.count({
                    where: {
                        attendance: { userId: user.id },
                        breakType: 'TEA',
                        startTime: {
                            gte: startOfDay,
                            lt: b.startTime
                        }
                    }
                });

                const isTea1 = priorTeaCount === 0;
                const isTea2 = priorTeaCount >= 1;

                if (breakCategory === 'TEA_1' && !isTea1) continue;
                if (breakCategory === 'TEA_2' && !isTea2) continue;
            }

            // Check if duration exceeds threshold (17 mins for tea, 47 mins for lunch)
            if (durationMinutes >= threshold) {
                const exceededBy = durationMinutes - allowedLimit;
                const startTimeFormatted = formatISTTime(startTime);

                exceededList.push({
                    logId: b.id,
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    designation: user.designation,
                    breakCategory,
                    breakName: breakLabel,
                    allowedLimit,
                    durationMinutes,
                    exceededBy,
                    startTimeFormatted
                });

                // Send alert to employee directly if phone is present
                if (user.phone) {
                    try {
                        await whatsappService.sendBreakExceedanceAlert(
                            user.phone,
                            user.name,
                            breakLabel,
                            allowedLimit,
                            {
                                startTimeFormatted,
                                durationMinutes,
                                exceededBy
                            }
                        );
                    } catch (empErr) {
                        console.warn(`[BreakCron] WhatsApp alert to employee ${user.name} failed:`, empErr.message);
                    }
                }
            }
        }

        // "if nobody is there dont send"
        if (exceededList.length === 0) {
            console.log(`[BreakCron] No employees exceeded ${breakLabel} limit. "if nobody is there dont send". Skipping.`);
            return;
        }

        const nowIST = formatISTDateTime(now);
        const alertTitle = alertNum === 1 ? `${breakLabel} Exceedance (1st Alert)` : `${breakLabel} Exceedance (2nd Reminder)`;

        // 1. Send WhatsApp Summary to Admin Phone: 90927 05679
        try {
            await whatsappService.sendBreakExceedanceSummaryList(ADMIN_ALERT_PHONE, exceededList, alertTitle);
            console.log(`[BreakCron] WhatsApp summary sent to ${ADMIN_ALERT_PHONE} for ${exceededList.length} employee(s)`);
        } catch (waErr) {
            console.error(`[BreakCron] WhatsApp summary error:`, waErr.message);
        }

        // 2. Send Email Alert to Admin Email: es.cookscape@gmail.com
        try {
            const tableRows = exceededList.map((item) => `
                <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">
                        ${item.name}
                        <div style="font-size: 11px; color: #64748b; font-weight: normal;">${item.designation || 'Staff'}</div>
                    </td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.breakName}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #475569;">${item.startTimeFormatted}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">${item.durationMinutes} mins</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${item.allowedLimit} mins</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: #fee2e2; color: #dc2626; font-weight: 700; font-size: 11px;">
                            +${item.exceededBy}m exceeded
                        </span>
                    </td>
                </tr>
            `).join('');

            const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px;">
                <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; padding: 22px 26px;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">⚠️ ${alertTitle}</h2>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Reported at ${nowIST} (IST)</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 16px; font-size: 14px; color: #334155; line-height: 1.5;">
                            The following <b>${exceededList.length} employee${exceededList.length > 1 ? 's have' : ' has'}</b> exceeded their allocated break duration:
                        </p>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                            <thead>
                                <tr style="background-color: #f1f5f9; color: #475569; font-weight: 700;">
                                    <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">Employee</th>
                                    <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">Break</th>
                                    <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">Start Time</th>
                                    <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">Time Spent</th>
                                    <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">Allowed</th>
                                    <th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">Exceeded</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                    <div style="background-color: #f8fafc; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
                        PeopleDesk Automated Attendance Monitoring • CookScape
                    </div>
                </div>
            </body>
            </html>
            `;

            const emailText = `PEOPLEDESK BREAK EXCEEDANCE ALERT: ${alertTitle}\nReported at: ${nowIST}\n\n` +
                exceededList.map((item, idx) => 
                    `${idx + 1}. ${item.name} (${item.designation || 'Staff'})
• Break: ${item.breakName}
• Start Time: ${item.startTimeFormatted}
• Time Spent: ${item.durationMinutes} mins
• Allowed: ${item.allowedLimit} mins
• Exceeded By: ${item.exceededBy} mins`
                ).join('\n\n');

            await sendEmail({
                to: ADMIN_ALERT_EMAIL,
                subject: `🚨 ${alertTitle} (${exceededList.length} Employee${exceededList.length > 1 ? 's' : ''}) - PeopleDesk`,
                html: emailHtml,
                text: emailText
            });

            console.log(`[BreakCron] Email sent to ${ADMIN_ALERT_EMAIL} for ${exceededList.length} employee(s)`);
        } catch (emailErr) {
            console.error(`[BreakCron] Email error:`, emailErr.message);
        }

    } catch (error) {
        console.error('[BreakCron] Error:', error);
    }
};

/**
 * Initializes Scheduled Break Exceedance Monitoring:
 * - First Break (Tea 1): 11:17 AM & 11:22 AM (5 mins after 11:17 AM)
 * - Lunch Break: 1:47 PM & 1:52 PM (5 mins after 1:47 PM)
 * - Second Break (Tea 2): 5:17 PM & 5:22 PM (5 mins after 5:17 PM)
 * - If nobody is there, does NOT send.
 */
const initBreakExceedanceCron = () => {
    // 1. Morning Tea Break (1st Break)
    // First alert: 11:17 AM IST
    cron.schedule('17 11 * * *', () => checkAndSendScheduledBreakAlert('TEA_1', 1), { timezone: 'Asia/Kolkata' });
    // Second reminder: 11:22 AM IST (5 mins after 11:17 AM)
    cron.schedule('22 11 * * *', () => checkAndSendScheduledBreakAlert('TEA_1', 2), { timezone: 'Asia/Kolkata' });

    // 2. Lunch Break
    // First alert: 1:47 PM IST (13:47)
    cron.schedule('47 13 * * *', () => checkAndSendScheduledBreakAlert('LUNCH', 1), { timezone: 'Asia/Kolkata' });
    // Second reminder: 1:52 PM IST (13:52) (5 mins after 1:47 PM)
    cron.schedule('52 13 * * *', () => checkAndSendScheduledBreakAlert('LUNCH', 2), { timezone: 'Asia/Kolkata' });

    // 3. Evening Tea Break (2nd Break)
    // First alert: 5:17 PM IST (17:17)
    cron.schedule('17 17 * * *', () => checkAndSendScheduledBreakAlert('TEA_2', 1), { timezone: 'Asia/Kolkata' });
    // Second reminder: 5:22 PM IST (17:22) (5 mins after 5:17 PM)
    cron.schedule('22 17 * * *', () => checkAndSendScheduledBreakAlert('TEA_2', 2), { timezone: 'Asia/Kolkata' });

    console.log('Break Exceedance Cron Initialized:');
    console.log(' - Tea 1: 11:17 AM & 11:22 AM IST');
    console.log(' - Lunch: 1:47 PM & 1:52 PM IST');
    console.log(' - Tea 2: 5:17 PM & 5:22 PM IST');
};

module.exports = initBreakExceedanceCron;
module.exports.initBreakExceedanceCron = initBreakExceedanceCron;
module.exports.checkAndSendScheduledBreakAlert = checkAndSendScheduledBreakAlert;
