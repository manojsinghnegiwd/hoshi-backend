-- DropForeignKey
ALTER TABLE "ScheduleLog" DROP CONSTRAINT "ScheduleLog_scheduleId_fkey";

-- AddForeignKey
ALTER TABLE "ScheduleLog" ADD CONSTRAINT "ScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
