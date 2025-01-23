/*
  Warnings:

  - You are about to drop the column `userId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ScheduleRun` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Thread` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "ScheduleRun" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "userId";
