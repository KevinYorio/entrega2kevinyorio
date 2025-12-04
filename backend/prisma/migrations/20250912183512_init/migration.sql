-- ============================================
-- MIGRATION: Initial database structure
-- Purpose: Create core tables for users, plans,
--          orders, payments and memberships.
-- ============================================

-- ============================================
-- TABLE: User
-- Stores all application users.
-- Passwords must be stored hashed.
-- Email is unique to prevent duplicates.
-- ============================================
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Unique email constraint
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");


-- ============================================
-- TABLE: Plan
-- Represents subscription plans/products.
-- Includes pricing, currency and active state.
-- ============================================
CREATE TABLE "public"."Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "sessionsPerWeek" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);


-- ============================================
-- TABLE: Order
-- Represents a purchase intent.
-- Links users with plans.
-- Stores historical price and statuses.
-- ============================================
CREATE TABLE "public"."Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "priceAtMoment" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalReference" TEXT,
    "preferenceId" TEXT,
    "merchantOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);


-- ============================================
-- TABLE: Payment
-- Stores payments returned by MercadoPago.
-- Prevents duplication via mpPaymentId unique index.
-- ============================================
CREATE TABLE "public"."Payment" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "mpPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "amount" INTEGER NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Prevent duplicate payments
CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "public"."Payment"("mpPaymentId");


-- ============================================
-- TABLE: Membership
-- Represents a user's active or inactive membership.
-- Derived from a successful order/payment.
-- ============================================
CREATE TABLE "public"."Membership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);


-- ============================================
-- FOREIGN KEYS
-- Defines relations between tables.
-- ON DELETE RESTRICT → prevents deleting referenced data.
-- ON UPDATE CASCADE → updates propagate safely.
-- ============================================

ALTER TABLE "public"."Order"
ADD CONSTRAINT "Order_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Order"
ADD CONSTRAINT "Order_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Payment"
ADD CONSTRAINT "Payment_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
