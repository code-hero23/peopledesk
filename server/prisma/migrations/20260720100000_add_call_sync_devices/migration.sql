CREATE TABLE "CallSyncDevice" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceName" TEXT,
    "secretHash" TEXT NOT NULL,
    "officialSim" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallSyncDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CallSyncDevice_secretHash_key" ON "CallSyncDevice"("secretHash");
CREATE INDEX "CallSyncDevice_userId_active_idx" ON "CallSyncDevice"("userId", "active");
ALTER TABLE "CallSyncDevice" ADD CONSTRAINT "CallSyncDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CallSyncActivationCode" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallSyncActivationCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CallSyncActivationCode_codeHash_key" ON "CallSyncActivationCode"("codeHash");
CREATE INDEX "CallSyncActivationCode_userId_expiresAt_idx" ON "CallSyncActivationCode"("userId", "expiresAt");
ALTER TABLE "CallSyncActivationCode" ADD CONSTRAINT "CallSyncActivationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
