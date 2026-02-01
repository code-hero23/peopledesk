const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const analyzeWorkLogs = async () => {
    try {
        // Get date from args or default to today
        const dateArg = process.argv[2];
        let startOfDay, endOfDay;

        if (dateArg) {
            startOfDay = new Date(dateArg);
            startOfDay.setHours(0, 0, 0, 0);

            if (isNaN(startOfDay.getTime())) {
                console.error('Invalid date format. Please use YYYY-MM-DD');
                process.exit(1);
            }
        } else {
            startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
        }

        endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`\nAnalyzing Worklogs for: ${startOfDay.toLocaleDateString()} ...\n`);

        const logs = await prisma.workLog.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: { user: true },
            orderBy: { user: { designation: 'asc' } }
        });

        if (logs.length === 0) {
            console.log('No worklogs found for this date.');
            return;
        }

        // Group by Designation
        const grouped = logs.reduce((acc, log) => {
            const role = log.user.designation || 'UNKNOWN';
            if (!acc[role]) acc[role] = [];
            acc[role].push(log);
            return acc;
        }, {});

        // Display Tables per Role
        for (const role of Object.keys(grouped)) {
            console.log(`\n--- ${role} Logs (${grouped[role].length}) ---`);
            const roleLogs = grouped[role];

            if (role === 'CRE') {
                console.table(roleLogs.map(l => ({
                    User: l.user.name,
                    Status: l.logStatus,
                    Calls: l.cre_totalCalls,
                    Visits: l.cre_showroomVisits,
                    Orders: l.cre_orders,
                    Proposals: l.cre_proposals
                })));
            } else if (role === 'FA') {
                console.table(roleLogs.map(l => ({
                    User: l.user.name,
                    Status: l.logStatus,
                    Calls: l.fa_calls,
                    SiteVisits: l.fa_siteVisits,
                    ShowroomVisits: l.fa_showroomVisits,
                    PendingQuotes: l.fa_quotePending
                })));
            } else if (role === 'LA') {
                console.table(roleLogs.map(l => ({
                    User: l.user.name,
                    Status: l.logStatus,
                    Project: l.la_number || 'N/A',
                    Location: l.la_projectLocation,
                    Value: l.la_projectValue
                })));
            } else if (role === 'AE') {
                console.table(roleLogs.map(l => ({
                    User: l.user.name,
                    Status: l.logStatus,
                    SiteStatus: l.ae_siteStatus,
                    WorkStage: l.ae_workStage,
                    Issues: l.ae_hasIssues ? 'YES' : 'NO'
                })));
            } else {
                console.table(roleLogs.map(l => ({
                    User: l.user.name,
                    Status: l.logStatus === 'CLOSED' ? 'Submitted' : 'Pending',
                    Process: l.process || l.tasks || 'N/A', // Display Process
                    Client: l.clientName || l.projectName || 'N/A', // Display Client
                    Hours: l.hours || 0, // Display Hours
                    Site: l.site || 'N/A' // Display Site
                })));
            }
        }

    } catch (error) {
        console.error('Error analyzing logs:', error);
    } finally {
        await prisma.$disconnect();
    }
};

analyzeWorkLogs();
