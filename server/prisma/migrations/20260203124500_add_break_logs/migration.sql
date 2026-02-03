-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('TEA', 'LUNCH', 'CLIENT_MEETING', 'BH_MEETING');

-- CreateTable
CREATE TABLE "BreakLog" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "breakType" "BreakType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "BreakLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BreakLog" ADD CONSTRAINT "BreakLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
