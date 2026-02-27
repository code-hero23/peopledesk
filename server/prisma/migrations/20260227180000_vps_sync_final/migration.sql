-- Final Sync Migration for VPS
-- Fixes missing column in User and missing GlobalSetting table

-- 1. Add missing column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeShortageDeductionEnabled" BOOLEAN NOT NULL DEFAULT true;

-- 2. Create GlobalSetting table if it doesn't exist
CREATE TABLE IF NOT EXISTS "GlobalSetting" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- 3. Create unique index on key if it doesn't exist
DO $$ BEGIN
    CREATE UNIQUE INDEX "GlobalSetting_key_key" ON "GlobalSetting"("key");
EXCEPTION WHEN duplicate_table THEN null; END $$;
