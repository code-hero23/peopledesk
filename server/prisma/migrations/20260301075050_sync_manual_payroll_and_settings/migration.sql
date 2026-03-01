-- AlterTable
ALTER TABLE "PopupConfig" ADD COLUMN     "type" "PopupType" NOT NULL DEFAULT 'INSPIRATIONAL';

-- CreateTable
CREATE TABLE "ManualPayroll" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "allocatedSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absenteeismDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortageDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayout" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualPayroll_email_month_year_key" ON "ManualPayroll"("email", "month", "year");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
