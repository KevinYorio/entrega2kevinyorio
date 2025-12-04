-- ============================================
-- MIGRATION: Add Refresh Token system
-- Purpose: Introduce secure refresh tokens for
--          authentication, allowing token renewal
--          and token revocation handling.
-- ============================================

-- ============================================
-- TABLE: RefreshToken
-- Stores hashed refresh tokens for each user.
-- tokenHash ensures tokens are never stored in plain text.
-- revoked = true marks tokens that must no longer be used.
-- ============================================
CREATE TABLE "public"."RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- INDEX: RefreshToken_userId_revoked_idx
-- Optimizes lookups for non-revoked tokens of a user.
-- Used when refreshing access tokens.
-- ============================================
CREATE INDEX "RefreshToken_userId_revoked_idx"
ON "public"."RefreshToken"("userId", "revoked");

-- ============================================
-- INDEX: Membership_userId_status_endsAt_idx
-- Improves queries checking active memberships,
-- especially those ordered by expiration date.
-- ============================================
CREATE INDEX "Membership_userId_status_endsAt_idx"
ON "public"."Membership"("userId", "status", "endsAt");

-- ============================================
-- FOREIGN KEY
-- Links RefreshToken to User.
-- Prevents deleting a user that still has tokens.
-- ============================================
ALTER TABLE "public"."RefreshToken"
ADD CONSTRAINT "RefreshToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
