const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { sendEmail } = require("../utils/emailService");
const {
    checkAndNotifyExcessiveRequests
} = require("../controllers/requestController");

const initWeeklyExcessiveAbsenceCron = () => {
    cron.schedule("*/2 * * * *", async () => {

    // cron.schedule(
    //     "30 23 * * 0",
    //     async () => {

            console.log("Running Weekly Excessive Absence Report...");

            try {

                const today = new Date();

                // Get only active employees
                const users = await prisma.user.findMany({
                    where: {
                        status: "ACTIVE",
                        role: "EMPLOYEE"
                    },
                    select: {
                        id: true     
                    }
                });

                // Check all employees simultaneously
                const report = (
                    await Promise.all(
                        users.map(user =>
                            checkAndNotifyExcessiveRequests(
                                user.id,
                                today
                            )
                        )
                    )
                ).filter(Boolean);

                if (report.length === 0) {
                    console.log("No excessive requests found.");
                    return;
                }

                // Attendance cycle
                const cycleStart = new Date(report[0].cycleStart);
                const cycleEnd = new Date(report[0].cycleEnd);

                // -----------------------------
                // Reporting Week (Monday-Sunday)
                // -----------------------------
                const weekStart = new Date(today);

                const day = weekStart.getDay();

                const diff = day === 0 ? 6 : day - 1;

                weekStart.setDate(
                    weekStart.getDate() - diff
                );

                const weekEnd = new Date(weekStart);

                weekEnd.setDate(
                    weekStart.getDate() + 6
                );

                // Restrict within attendance cycle
                if (weekStart < cycleStart) {
                    weekStart.setTime(cycleStart.getTime());
                }

                if (weekEnd > cycleEnd) {
                    weekEnd.setTime(cycleEnd.getTime());
                }

                const WEEK_IN_MS =
                    7 * 24 * 60 * 60 * 1000;

                const weekNumber =
                    Math.floor(
                        (weekStart - cycleStart) /
                        WEEK_IN_MS
                    ) + 1;

                const attendanceCycle =
                    `${cycleStart.toLocaleDateString("en-GB")} - ${cycleEnd.toLocaleDateString("en-GB")}`;

                const reportingWeek =
                    `${weekStart.toLocaleDateString("en-GB")} - ${weekEnd.toLocaleDateString("en-GB")}`;

                const generatedOn =
                    today.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short"
                    });

                // -----------------------------
                // Table Rows
                // -----------------------------
                const rows = report.map((emp, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${emp.name}</td>
                        <td>${emp.designation ?? "-"}</td>
                        <td>${emp.permissionCount}</td>
                        <td>${emp.leaveDays}</td>
                    </tr>
                `).join("");

                // -----------------------------
                // Email Template
                // -----------------------------
                const html = `
                <div style="font-family:Arial;padding:20px">

                    <h2 style="color:#d32f2f">
                        Weekly Excessive Absence Report
                    </h2>

                    <p>
                        <strong>Attendance Cycle:</strong>
                        ${attendanceCycle}
                    </p>

                    <p>
                        <strong>Reporting Week:</strong>
                        ${reportingWeek}
                    </p>

                    <p>
                        <strong>Week Number:</strong>
                        Week ${weekNumber}
                    </p>

                    <table
                        border="1"
                        cellspacing="0"
                        cellpadding="8"
                        style="border-collapse:collapse;width:100%;text-align:left">

                        <thead style="background:#eeeeee">

                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Permissions</th>
                                <th>Leave Days</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${rows}

                        </tbody>

                    </table>

                    <br>

                    <p>
                        This is an automated weekly report generated by
                        <strong>PeopleDesk</strong>.
                    </p>

                </div>
                `;

                // -----------------------------
                // HR + All BH Emails
                // -----------------------------
                const recipients = [
                    // "es.cookscape@gmail.com",
                    'abiyuvan4@gmail.com',
                    ...new Set(
                        report
                            .map(emp => emp.bhEmail)
                            .filter(Boolean)
                    )
                ];

                await sendEmail({
                    to: recipients.join(","),
                    subject: `Weekly Excessive Absence Report - Week ${weekNumber}`,
                    html
                });

                console.log(
                    `Weekly report sent successfully to ${recipients.length} recipients.`
                );

            } catch (err) {

                console.error(
                    "Weekly Excessive Absence Cron Error:",
                    err
                );

            }

        }, 
        {
            timezone: "Asia/Kolkata"
        }
    );

    console.log("Weekly Excessive Absence Cron Initialized");
};

module.exports = {
    initWeeklyExcessiveAbsenceCron
};