/*
  Warnings:

  - You are about to drop the column `dateOfBirth` on the `employees` table. All the data in the column will be lost.
  - Added the required column `middlename` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "employee_personal_details" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "dateOfBirth",
ADD COLUMN     "middlename" TEXT NOT NULL;
