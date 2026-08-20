const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOnlyEventTables() {
    console.log('--- SAFELY CREATING EVENT TABLES ONLY (Zero existing data touched) ---');
    try {
        // 1. Create PublicEvent table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "public"."PublicEvent" (
                "id" TEXT NOT NULL,
                "slug" TEXT NOT NULL,
                "title" TEXT NOT NULL,
                "description" TEXT,
                "games" JSONB NOT NULL,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PublicEvent_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✓ PublicEvent table checked/created');

        // 2. Create Unique Index on slug
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "PublicEvent_slug_key" ON "public"."PublicEvent"("slug");
        `);
        console.log('✓ PublicEvent slug index checked/created');

        // 3. Create PublicEventResponse table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "public"."PublicEventResponse" (
                "id" TEXT NOT NULL,
                "eventId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "selectedGames" JSONB NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PublicEventResponse_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "PublicEventResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."PublicEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);
        console.log('✓ PublicEventResponse table checked/created');

        // 4. Create Index on eventId
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "PublicEventResponse_eventId_idx" ON "public"."PublicEventResponse"("eventId");
        `);
        console.log('✓ PublicEventResponse index checked/created');

        console.log('\n SUCCESS: Event tables created safely without touching ANY other table or column in your database.');
    } catch (error) {
        console.error('Error creating event tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createOnlyEventTables();
