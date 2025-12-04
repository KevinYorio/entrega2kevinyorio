-- ============================================
-- ENUMS DEL SISTEMA
-- Estos tipos permiten estandarizar roles,
-- estados de reservas, facturas y días laborales.
-- ============================================

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'RECEPTION', 'COACH');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WeekDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');

-- ============================================
-- MODIFICACIÓN DE TABLA USER
-- Se agregan campos de activación, teléfono
-- y rol del usuario para manejar perfiles.
-- ============================================
ALTER TABLE "public"."User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'USER';

-- ============================================
-- TABLA EMPLOYEE
-- Representa personal del gimnasio/empresa:
-- coaches, recepción, administración, etc.
-- Incluye hora laboral (hourRate) para cálculos.
-- ============================================
CREATE TABLE "public"."Employee" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'COACH',
    "hourRate" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLA PROVIDER
-- Proveedores externos para compras y servicios.
-- ============================================
CREATE TABLE "public"."Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLA EXPENSE
-- Registro de gastos vinculados a proveedores.
-- amount DECIMAL para manipulación contable precisa.
-- ============================================
CREATE TABLE "public"."Expense" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLA CLASS
-- Modela una clase grupal:
-- día, horarios, capacidad, coach asignado.
-- coachId puede quedar en NULL si el empleado se borra.
-- ============================================
CREATE TABLE "public"."Class" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "day" "public"."WeekDay" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER,
    "coachId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLA BOOKING
-- Reserva de un alumno a una clase.
-- Incluye check-in, estado y token único.
-- ============================================
CREATE TABLE "public"."Booking" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "classId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkInAt" TIMESTAMP(3),
    "checkInToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLA INVOICE
-- Cabecera de una factura del sistema.
-- number puede ser correlativo externo.
-- ============================================
CREATE TABLE "public"."Invoice" (
    "id" SERIAL NOT NULL,
    "number" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLA INVOICE ITEM
-- Detalle de ítems de una factura.
-- ============================================
CREATE TABLE "public"."InvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- ÍNDICES
-- Mejoran rendimiento en búsquedas, listados y reportes.
-- ============================================
CREATE UNIQUE INDEX "Employee_email_key" ON "public"."Employee"("email");
CREATE INDEX "Employee_role_idx" ON "public"."Employee"("role");
CREATE INDEX "Employee_active_idx" ON "public"."Employee"("active");

CREATE INDEX "Provider_name_idx" ON "public"."Provider"("name");
CREATE INDEX "Provider_active_idx" ON "public"."Provider"("active");

CREATE INDEX "Expense_date_idx" ON "public"."Expense"("date");
CREATE INDEX "Expense_providerId_idx" ON "public"."Expense"("providerId");

CREATE INDEX "Class_day_idx" ON "public"."Class"("day");

CREATE UNIQUE INDEX "Booking_checkInToken_key" ON "public"."Booking"("checkInToken");
CREATE INDEX "Booking_date_idx" ON "public"."Booking"("date");
CREATE INDEX "Booking_status_idx" ON "public"."Booking"("status");
CREATE INDEX "Booking_classId_idx" ON "public"."Booking"("classId");
CREATE INDEX "Booking_studentId_idx" ON "public"."Booking"("studentId");

CREATE INDEX "Invoice_date_idx" ON "public"."Invoice"("date");
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");
CREATE INDEX "Invoice_studentId_idx" ON "public"."Invoice"("studentId");

CREATE INDEX "Plan_isActive_idx" ON "public"."Plan"("isActive");

CREATE INDEX "User_role_idx" ON "public"."User"("role");
CREATE INDEX "User_emailVerified_idx" ON "public"."User"("emailVerified");

-- ============================================
-- FOREIGN KEYS
-- Establecen relaciones entre entidades manteniendo
-- integridad referencial.
-- ============================================
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
