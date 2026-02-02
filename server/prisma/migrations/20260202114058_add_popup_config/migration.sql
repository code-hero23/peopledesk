/*
  Warnings:

  - You are about to drop the `CEOQuote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CEOQuote";

-- CreateTable
CREATE TABLE "PopupConfig" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopupConfig_pkey" PRIMARY KEY ("id")
);
