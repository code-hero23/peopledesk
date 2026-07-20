const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { sendEmail } = require("../utils/emailService");
const {
    checkAndNotifyExcessiveRequests
} = require("../controllers/requestController");

const initWeeklyExcessiveAbsenceCron = () => {
    // Runs every Sunday at 11:30 PM IST
    cron.schedule(
        "30 23 * * 0",
        async () => {
            console.log("Running Weekly Excessive Absence Report...");

            try {
                const today = new Date();

                // ----------------------------------------
                // Calculate attendance cycle: 26th to 25th
                // ----------------------------------------
                let cycleStart;
                let cycleEnd;

                if (today.getDate() <= 25) {
                    // Example: 20 July
                    // Cycle: 26 June to 25 July
                    cycleStart = new Date(
                        today.getFullYear(),
                        today.getMonth() - 1,
                        26
                    );

                    cycleEnd = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        25
                    );
                } else {
                    // Example: 26 July
                    // Cycle: 26 July to 25 August
                    cycleStart = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        26
                    );

                    cycleEnd = new Date(
                        today.getFullYear(),
                        today.getMonth() + 1,
                        25
                    );
                }

                // Start of cycle
                cycleStart.setHours(0, 0, 0, 0);

                // End of cycle
                cycleEnd.setHours(23, 59, 59, 999);

                // ----------------------------------------
                // Get active employees
                // ----------------------------------------
                const users = await prisma.user.findMany({
                    where: {
                        status: "ACTIVE",
                        role: "EMPLOYEE"
                    },
                    select: {
                        id: true
                    }
                });

                // ----------------------------------------
                // Check excessive requests
                // ----------------------------------------
                const report = (
                    await Promise.all(
                        users.map((user) =>
                            checkAndNotifyExcessiveRequests(
                                user.id,
                                today
                            )
                        )
                    )
                ).filter(Boolean);

                // ----------------------------------------
                // Email recipients
                // ----------------------------------------
                const recipients = [
                    process.env.EMAIL_FROM,
                    ...new Set(
                        report
                            .map((employee) => employee.bhEmail)
                            .filter(Boolean)
                    )
                ].filter(Boolean);

                if (recipients.length === 0) {
                    console.log(
                        "Weekly report was not sent because no email recipients were found."
                    );

                    return;
                }

                // ----------------------------------------
                // Calculate reporting week: Monday-Sunday
                // ----------------------------------------
                const weekStart = new Date(today);

                const currentDay = weekStart.getDay();

                // Sunday = 0, Monday = 1
                const daysFromMonday =
                    currentDay === 0
                        ? 6
                        : currentDay - 1;

                weekStart.setDate(
                    weekStart.getDate() - daysFromMonday
                );

                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);

                weekEnd.setDate(
                    weekStart.getDate() + 6
                );

                weekEnd.setHours(23, 59, 59, 999);

                // ----------------------------------------
                // Format dates
                // ----------------------------------------
                const formatDate = (date) =>
                    date.toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata"
                    });

                const attendanceCycle =
                    `${formatDate(cycleStart)} - ${formatDate(cycleEnd)}`;

                const reportingWeek =
                    `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

                // ----------------------------------------
                // No excessive requests found
                // ----------------------------------------
                if (report.length === 0) {
                    console.log("No excessive requests found.");

                    const html = `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">

                            <h2 style="color: #2e7d32;">
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

                            <p style="font-size: 16px; color: #2e7d32;">
                                ✅ There were no excessive leave requests
                                or permission requests reported this week.
                            </p>

                            <br>

                            <p>
                                This is an automated weekly report generated by
                                <strong>PeopleDesk</strong>.
                            </p>

                        </div>
                    `;

                    await sendEmail({
                        // to: 'elakkiya.sakthivelu3089@gmail.com',
                        to: recipients.join(","),
                        subject:
                            "Weekly Excessive Absence Report - No Excessive Requests",
                        html
                    });

                    console.log(
                        "Weekly summary email sent successfully."
                    );

                    return;
                }

                // ----------------------------------------
                // Generate report table rows
                // ----------------------------------------
                const rows = report
                    .map(
                        (employee, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${employee.name}</td>
                                <td>${employee.designation ?? "-"}</td>
                                <td>${employee.permissionCount ?? 0}</td>
                                <td>${employee.leaveDays ?? 0}</td>
                            </tr>
                        `
                    )
                    .join("");

                // ----------------------------------------
                // Excessive absence email template
                // ----------------------------------------
                const html = `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">

                        <h2 style="color: #d32f2f;">
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

                        <table
                            border="1"
                            cellspacing="0"
                            cellpadding="8"
                            style="
                                border-collapse: collapse;
                                width: 100%;
                                text-align: left;
                            "
                        >
                            <thead style="background: #eeeeee;">
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

                await sendEmail({
                    // to: 'elakkiya.sakthivelu3089@gmail.com',
                    to: recipients.join(","),
                    subject: "Weekly Excessive Absence Report",
                    html
                });

                console.log(
                    `Weekly report sent successfully to ${recipients.length} recipients.`
                );
            } catch (error) {
                console.error(
                    "Weekly Excessive Absence Cron Error:",
                    error
                );
            }
        },
        {
            timezone: "Asia/Kolkata"
        }
    );

    console.log(
        "Weekly Excessive Absence Cron Initialized - Every Sunday at 11:30 PM IST"
    );
};
module.exports = {
    initWeeklyExcessiveAbsenceCron
};
