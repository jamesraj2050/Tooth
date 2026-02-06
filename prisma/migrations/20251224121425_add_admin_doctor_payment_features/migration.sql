-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'PARTIAL');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DOCTOR';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "patientEmail" TEXT,
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientPhone" TEXT,
ADD COLUMN     "paymentAmount" DECIMAL(10,2),
ADD COLUMN     "paymentStatus" "PaymentStatus" DEFAULT 'PENDING',
ALTER COLUMN "patientId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_paymentStatus_idx" ON "Appointment"("paymentStatus");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
