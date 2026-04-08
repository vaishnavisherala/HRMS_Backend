/*
  Warnings:

  - You are about to drop the column `is_verified` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "is_verified",
DROP COLUMN "name",
DROP COLUMN "status",
ADD COLUMN     "DOJ" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "Gender" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "f_name" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "l_name" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "m_name" TEXT NOT NULL DEFAULT 'Unknown';

-- CreateTable
CREATE TABLE "EmployeeDetails" (
    "emp_id" INTEGER NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "perm_addr" TEXT NOT NULL,
    "work_addr" TEXT NOT NULL,
    "comm_addr" TEXT NOT NULL,
    "aadhar_no" VARCHAR(12) NOT NULL,
    "pan_card" VARCHAR(10) NOT NULL,
    "phone_no_pri" VARCHAR(15) NOT NULL,
    "phone_no_sec" VARCHAR(15),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDetails_pkey" PRIMARY KEY ("emp_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDetails_aadhar_no_key" ON "EmployeeDetails"("aadhar_no");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDetails_pan_card_key" ON "EmployeeDetails"("pan_card");

-- CreateIndex
CREATE INDEX "EmployeeDetails_emp_id_idx" ON "EmployeeDetails"("emp_id");

-- CreateIndex
CREATE INDEX "ActivationToken_emp_id_idx" ON "ActivationToken"("emp_id");

-- AddForeignKey
ALTER TABLE "EmployeeDetails" ADD CONSTRAINT "EmployeeDetails_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("emp_id") ON DELETE RESTRICT ON UPDATE CASCADE;
