-- CreateTable
CREATE TABLE "WorkspacePermission" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspacePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSetting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "allowGuests" BOOLEAN NOT NULL DEFAULT false,
    "allowPublicPrompts" BOOLEAN NOT NULL DEFAULT false,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "storageQuotaGb" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "WorkspaceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceBilling" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "storageUsedGb" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkspaceBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePermission_workspaceId_userId_permission_key" ON "WorkspacePermission"("workspaceId", "userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSetting_workspaceId_key" ON "WorkspaceSetting"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceBilling_workspaceId_key" ON "WorkspaceBilling"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceSetting" ADD CONSTRAINT "WorkspaceSetting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBilling" ADD CONSTRAINT "WorkspaceBilling_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
