-- AlterTable
ALTER TABLE "Finance" ADD COLUMN     "carpenterImpactEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CarpenterRecord" (
    "id" SERIAL NOT NULL,
    "aeName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "carpenterName" TEXT NOT NULL,
    "workOrderValue" DOUBLE PRECISION NOT NULL,
    "leoSirRate" DOUBLE PRECISION NOT NULL,
    "cookscapeRate" DOUBLE PRECISION NOT NULL,
    "advance" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarpenterRecord_pkey" PRIMARY KEY ("id")
);
