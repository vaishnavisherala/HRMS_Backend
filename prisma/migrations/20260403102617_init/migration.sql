-- CreateTable
CREATE TABLE "Admin" (
    "admin_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "emp_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Inactive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("emp_id")
);

-- CreateTable
CREATE TABLE "ActivationToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "emp_id" INTEGER NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationToken_token_key" ON "ActivationToken"("token");

-- AddForeignKey
ALTER TABLE "ActivationToken" ADD CONSTRAINT "ActivationToken_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("emp_id") ON DELETE RESTRICT ON UPDATE CASCADE;
