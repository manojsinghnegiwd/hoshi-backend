-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('INTERVAL', 'CRON', 'FIXED');

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "lastRun" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "nextRun" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ScheduleLog" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleLog_scheduleId_idx" ON "ScheduleLog"("scheduleId");

-- AddForeignKey
ALTER TABLE "ScheduleLog" ADD CONSTRAINT "ScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
