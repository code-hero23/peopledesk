const { PrismaClient } = require('@prisma/client');

const passwords = [
    'postgres',
    'admin',
    'root',
    'password',
    'Postgres@123',
    'postgres@123',
    'cookscape',
    'cookscape@123',
    'orbix',
    'orbix@123',
    '123456',
    '1234',
    'postgre',
    '' // empty password
];

async function tryPassword(password) {
    const url = `postgresql://postgres:${encodeURIComponent(password)}@localhost:5432/cookscape_worksphere?schema=public`;
    process.env.DATABASE_URL = url;
    
    // We must instantiate a new client for each URL
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: url
            }
        }
    });
    
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('SUCCESS! Password is:', password === '' ? '(empty)' : password);
        return true;
    } catch (e) {
        // console.log('Failed password:', password, e.message);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    for (const p of passwords) {
        const success = await tryPassword(p);
        if (success) {
            process.exit(0);
        }
    }
    console.log('None of the hardcoded passwords worked.');
}

run();
