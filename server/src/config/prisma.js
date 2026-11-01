const { PrismaClient } = require('@prisma/client');

// Ensure connection limit and timeout are strictly configured to prevent connection exhaustion
let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
    try {
        const urlObj = new URL(dbUrl);
        if (!urlObj.searchParams.has('connection_limit')) {
            urlObj.searchParams.set('connection_limit', '10');
        }
        if (!urlObj.searchParams.has('pool_timeout')) {
            urlObj.searchParams.set('pool_timeout', '15');
        }
        process.env.DATABASE_URL = urlObj.toString();
    } catch (e) {
        // If DATABASE_URL is not a standard URL, append query params safely
        if (!dbUrl.includes('connection_limit=')) {
            const separator = dbUrl.includes('?') ? '&' : '?';
            process.env.DATABASE_URL = `${dbUrl}${separator}connection_limit=10&pool_timeout=15`;
        }
    }
}

// Use a global singleton across the Node process to prevent multiple connection pools
const globalForPrisma = global;

const prisma = globalForPrisma.__peopledesk_prisma__ || new PrismaClient({
    datasources: process.env.DATABASE_URL ? {
        db: {
            url: process.env.DATABASE_URL
        }
    } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

globalForPrisma.__peopledesk_prisma__ = prisma;

// Gracefully disconnect on process termination to immediately free PostgreSQL connections
const handleShutdown = async () => {
    try {
        await prisma.$disconnect();
    } catch (err) {
        // ignore errors during shutdown
    }
};

process.once('SIGINT', handleShutdown);
process.once('SIGTERM', handleShutdown);

module.exports = prisma;
module.exports.prisma = prisma;

