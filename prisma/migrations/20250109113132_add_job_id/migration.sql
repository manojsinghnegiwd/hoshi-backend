/*
  Warnings:

  - You are about to drop the `ScheduleLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ScheduleLog" DROP CONSTRAINT "ScheduleLog_scheduleId_fkey";

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "jobId" TEXT;

-- DropTable
DROP TABLE "ScheduleLog";

-- CreateTable
CREATE TABLE "ScheduleRun" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "threadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRun_threadId_key" ON "ScheduleRun"("threadId");

-- CreateIndex
CREATE INDEX "ScheduleRun_scheduleId_idx" ON "ScheduleRun"("scheduleId");

-- AddForeignKey
ALTER TABLE "ScheduleRun" ADD CONSTRAINT "ScheduleRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRun" ADD CONSTRAINT "ScheduleRun_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
