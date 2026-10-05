/*
  Warnings:

  - Added the required column `corporate_id` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "corporate_id" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "Admin_corporate_id_idx" ON "Admin"("corporate_id");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_corporate_id_fkey" FOREIGN KEY ("corporate_id") REFERENCES "Corporate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
