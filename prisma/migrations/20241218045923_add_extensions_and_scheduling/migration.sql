/*
  Warnings:

  - You are about to drop the `Tool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkspaceTool` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WorkspaceTool" DROP CONSTRAINT "WorkspaceTool_toolId_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceTool" DROP CONSTRAINT "WorkspaceTool_workspaceId_fkey";

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "nextRun" TIMESTAMP(3);

-- DropTable
DROP TABLE "Tool";

-- DropTable
DROP TABLE "WorkspaceTool";

-- CreateTable
CREATE TABLE "Extension" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Extension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceExtension" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "extensionId" INTEGER NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "interval" INTEGER,
    "cronExpression" TEXT,
    "fixedTime" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Extension_name_key" ON "Extension"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceExtension_workspaceId_extensionId_key" ON "WorkspaceExtension"("workspaceId", "extensionId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_agentId_key" ON "Schedule"("agentId");

-- AddForeignKey
ALTER TABLE "WorkspaceExtension" ADD CONSTRAINT "WorkspaceExtension_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExtension" ADD CONSTRAINT "WorkspaceExtension_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "Extension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
