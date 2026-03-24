-- CreateTable
CREATE TABLE IF NOT EXISTS "BiometricLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "punchType" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_biometricId_key" ON "User"("biometricId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BiometricLog_userId_punchTime_idx" ON "BiometricLog"("userId", "punchTime");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BiometricLog" ADD CONSTRAINT "BiometricLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
