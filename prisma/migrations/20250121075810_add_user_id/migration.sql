/*
  Warnings:

  - Added the required column `userId` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ScheduleRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Thread` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleRun" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "userId" TEXT NOT NULL;
