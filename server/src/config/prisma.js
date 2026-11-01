const { PrismaClient } = require('@prisma/client');

// Use a global singleton across the Node process to prevent multiple connection pools
const globalForPrisma = global;

const prisma = globalForPrisma.__peopledesk_prisma__ || new PrismaClient({
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

