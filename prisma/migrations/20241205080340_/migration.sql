/*
  Warnings:

  - You are about to drop the column `description` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `IdeaHistory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `IdeaHistory` table. All the data in the column will be lost.
  - You are about to drop the `Learning` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LearningHistory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `content` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompt` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `IdeaHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `IdeaHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompt` to the `IdeaHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LearningHistory" DROP CONSTRAINT "LearningHistory_learningId_fkey";

-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "description",
DROP COLUMN "status",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'gpt-4',
ADD COLUMN     "prompt" TEXT NOT NULL,
ALTER COLUMN "source" SET DEFAULT 'ai';

-- AlterTable
ALTER TABLE "IdeaHistory" DROP COLUMN "description",
DROP COLUMN "status",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "prompt" TEXT NOT NULL;

-- DropTable
DROP TABLE "Learning";

-- DropTable
DROP TABLE "LearningHistory";

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteHistory" (
    "id" SERIAL NOT NULL,
    "noteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
