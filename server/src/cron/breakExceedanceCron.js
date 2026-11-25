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
 * Monitors active breaks and sends WhatsApp & Email alerts if they exceed the allowed time.
 * Policy:
 * - Tea Break 1 & 2: 15 mins + 2 mins grace = 17 mins total threshold
 * - Lunch Break: 45 mins + 2 mins grace = 47 mins total threshold
 * Alerts sent to:
 * - WhatsApp: 90927 05679 (and employee)
 * - Email: es.cookscape@gmail.com
 */
const initBreakExceedanceCron = () => {
    // Run every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
        const now = new Date();

        try {
            // Find all active breaks (no endTime) that haven't been alerted yet
            const activeBreaks = await prisma.breakLog.findMany({
                where: {
                    endTime: null,
                    isExceededAlertSent: false,
                    breakType: { in: ['TEA', 'LUNCH'] }
                },
                include: {
                    attendance: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (activeBreaks.length === 0) return;

            console.log(`[BreakCron] Checking ${activeBreaks.length} active breaks...`);

            const exceededList = [];

            for (const b of activeBreaks) {
                const startTime = new Date(b.startTime);
                const durationMinutes = Math.round((now - startTime) / 60000);
                const user = b.attendance.user;

                if (!user) continue;

                let allowedLimit = 0;
                let gracePeriod = 2; // 2 minutes grace period
                let threshold = 0;
                let breakName = '';

                if (b.breakType === 'TEA') {
                    allowedLimit = 15;
                    threshold = allowedLimit + gracePeriod; // 17 mins

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
                    breakName = priorTeaCount >= 1 ? 'Tea Break 2 (15 mins)' : 'Tea Break 1 (15 mins)';
                } else if (b.breakType === 'LUNCH') {
                    allowedLimit = 45;
                    threshold = allowedLimit + gracePeriod; // 47 mins
                    breakName = 'Lunch Break (45 mins)';
                }

                // Check if break duration exceeded threshold (allowed limit + grace period)
                if (durationMinutes > threshold) {
                    const exceededBy = durationMinutes - threshold;
                    const startTimeFormatted = formatISTTime(startTime);

                    console.log(`[BreakCron] Alert: User ${user.name} exceeded ${breakName} (${durationMinutes} mins > ${threshold} mins limit)`);

                    exceededList.push({
                        logId: b.id,
                        userId: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        designation: user.designation,
                        breakType: b.breakType,
                        breakName,
                        allowedLimit,
                        gracePeriod,
                        threshold,
                        durationMinutes,
                        exceededBy,
                        startTimeFormatted
                    });

                    // Send alert directly to employee if phone number is available
                    if (user.phone) {
                        try {
                            await whatsappService.sendBreakExceedanceAlert(
                                user.phone,
                                user.name,
                                breakName,
                                threshold,
                                {
                                    startTimeFormatted,
                                    durationMinutes,
                                    exceededBy
                                }
                            );
                        } catch (empErr) {
                            console.warn(`[BreakCron] Failed to alert employee ${user.name} via WhatsApp:`, empErr.message);
                        }
                    }

                    // Mark as sent to prevent duplicate alerts for the same break session
                    await prisma.breakLog.update({
                        where: { id: b.id },
                        data: { isExceededAlertSent: true }
                    });
                }
            }

            // If there are exceeded employees in this check, send consolidated alerts to Manager / Admin
            if (exceededList.length > 0) {
                const nowIST = formatISTDateTime(now);

                // 1. Send WhatsApp Summary to Admin Phone: 90927 05679
                try {
                    await whatsappService.sendBreakExceedanceSummaryList(ADMIN_ALERT_PHONE, exceededList);
                    console.log(`[BreakCron] WhatsApp alert sent to ${ADMIN_ALERT_PHONE} for ${exceededList.length} employee(s)`);
                } catch (waErr) {
                    console.error(`[BreakCron] Failed to send WhatsApp summary to ${ADMIN_ALERT_PHONE}:`, waErr.message);
                }

                // 2. Send Email Alert to Admin Email: es.cookscape@gmail.com
                try {
                    const tableRows = exceededList.map((item, idx) => `
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">
                                ${item.name}
                                <div style="font-size: 11px; color: #64748b; font-weight: normal;">${item.designation || 'Staff'}</div>
                            </td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.breakName}</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #475569;">${item.startTimeFormatted}</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">${item.durationMinutes} mins</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${item.allowedLimit}m + 2m grace = <b>${item.threshold}m</b></td>
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
                                <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">⚠️ Break Time Exceeded Alert</h2>
                                <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Reported at ${nowIST} (IST)</p>
                            </div>
                            <div style="padding: 24px;">
                                <p style="margin: 0 0 16px; font-size: 14px; color: #334155; line-height: 1.5;">
                                    The following <b>${exceededList.length} employee${exceededList.length > 1 ? 's have' : ' has'}</b> exceeded their allocated break duration beyond the 2-minute grace period:
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
                                PeopleDesk Automated Attendance & Break Monitoring • CookScape
                            </div>
                        </div>
                    </body>
                    </html>
                    `;

                    const emailText = `PEOPLEDESK BREAK EXCEEDANCE ALERT\nReported at: ${nowIST}\n\n` +
                        exceededList.map((item, idx) => 
                            `${idx + 1}. ${item.name} (${item.designation || 'Staff'})
   • Break: ${item.breakName}
   • Start Time: ${item.startTimeFormatted}
   • Duration: ${item.durationMinutes} mins
   • Allowed Limit: ${item.allowedLimit}m + 2m grace = ${item.threshold}m
   • Exceeded By: ${item.exceededBy} mins`
                        ).join('\n\n');

                    await sendEmail({
                        to: ADMIN_ALERT_EMAIL,
                        subject: `🚨 Alert: Break Exceeded by ${exceededList.length} Employee${exceededList.length > 1 ? 's' : ''} - PeopleDesk`,
                        html: emailHtml,
                        text: emailText
                    });

                    console.log(`[BreakCron] Email alert sent to ${ADMIN_ALERT_EMAIL} for ${exceededList.length} employee(s)`);
                } catch (emailErr) {
                    console.error(`[BreakCron] Failed to send email alert to ${ADMIN_ALERT_EMAIL}:`, emailErr.message);
                }
            }
        } catch (error) {
            console.error('[BreakCron] Error:', error);
        }
    });
};

module.exports = initBreakExceedanceCron;
