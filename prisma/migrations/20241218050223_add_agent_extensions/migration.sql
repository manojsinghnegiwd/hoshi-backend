-- AlterTable
ALTER TABLE "WorkspaceAgent" ADD COLUMN     "useAllExtensions" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AgentExtension" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "extensionId" INTEGER NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentExtension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentExtension_agentId_extensionId_key" ON "AgentExtension"("agentId", "extensionId");

-- AddForeignKey
ALTER TABLE "AgentExtension" ADD CONSTRAINT "AgentExtension_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExtension" ADD CONSTRAINT "AgentExtension_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "Extension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
