/*
  Warnings:

  - The `headEmployeeId` column on the `departments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `employees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `employees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `reportingManagerId` column on the `employees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `employeeId` on the `attendance_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `attendance_summaries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_address_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_documents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_educations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_identity_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_personal_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_previous_employments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employeeId` on the `employee_shifts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `employees` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `login_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_summaries" DROP CONSTRAINT "attendance_summaries_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_headEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_address_details" DROP CONSTRAINT "employee_address_details_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_documents" DROP CONSTRAINT "employee_documents_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_educations" DROP CONSTRAINT "employee_educations_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_identity_details" DROP CONSTRAINT "employee_identity_details_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_personal_details" DROP CONSTRAINT "employee_personal_details_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_previous_employments" DROP CONSTRAINT "employee_previous_employments_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_shifts" DROP CONSTRAINT "employee_shifts_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_reportingManagerId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_userId_fkey";

-- DropForeignKey
ALTER TABLE "login_history" DROP CONSTRAINT "login_history_userId_fkey";

-- AlterTable
ALTER TABLE "attendance_logs" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "attendance_summaries" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "headEmployeeId",
ADD COLUMN     "headEmployeeId" INTEGER;

-- AlterTable
ALTER TABLE "employee_address_details" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employee_documents" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employee_educations" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employee_identity_details" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employee_personal_details" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employee_previous_employments" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employee_shifts" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employees" DROP CONSTRAINT "employees_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
DROP COLUMN "reportingManagerId",
ADD COLUMN     "reportingManagerId" INTEGER,
ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "login_history" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "attendance_logs_employeeId_logDate_idx" ON "attendance_logs"("employeeId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summaries_employeeId_attendanceDate_key" ON "attendance_summaries"("employeeId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "employee_address_details_employeeId_addressTypeLkpId_key" ON "employee_address_details"("employeeId", "addressTypeLkpId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_identity_details_employeeId_identityTypeLkpId_key" ON "employee_identity_details"("employeeId", "identityTypeLkpId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_personal_details_employeeId_key" ON "employee_personal_details"("employeeId");

-- CreateIndex
CREATE INDEX "employee_shifts_employeeId_effectiveTo_idx" ON "employee_shifts"("employeeId", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE INDEX "login_history_userId_occurredAt_idx" ON "login_history"("userId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_personal_details" ADD CONSTRAINT "employee_personal_details_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_address_details" ADD CONSTRAINT "employee_address_details_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_previous_employments" ADD CONSTRAINT "employee_previous_employments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_educations" ADD CONSTRAINT "employee_educations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_identity_details" ADD CONSTRAINT "employee_identity_details_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
