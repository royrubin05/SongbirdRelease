-- Songbird Waiver App — canonical schema (Postgres)
-- Generated from prisma/schema.prisma and verified against Supabase on 2026-04-17.
--
-- USE WHEN: Prisma, the app, or the hosting provider is unavailable and you
-- need to recreate the database using only psql / a SQL console.
--
-- If Prisma IS available, prefer:   npx prisma db push
-- That stays in sync with prisma/schema.prisma automatically.
--
-- This file is a pure-SQL fallback. It is intentionally provider-agnostic:
-- works on any Postgres 14+ (Supabase, Neon, Cockroach, self-hosted).

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS "AgreementTemplate" (
    "id"        SERIAL          PRIMARY KEY,
    "name"      TEXT            NOT NULL,
    "content"   TEXT            NOT NULL,
    "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)    NOT NULL,
    "version"   INTEGER         NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SigningSession" (
    "id"                  TEXT          PRIMARY KEY,  -- uuid, set by app
    "status"              TEXT          NOT NULL DEFAULT 'CREATED',
    "agreementTemplateId" INTEGER       NOT NULL,
    "description"         TEXT,
    "designatedName"      TEXT,
    "designatedEmail"     TEXT,
    "isSigned"            BOOLEAN       NOT NULL DEFAULT false,
    "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "SigningSession_agreementTemplateId_fkey"
        FOREIGN KEY ("agreementTemplateId")
        REFERENCES "AgreementTemplate"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SignedAgreement" (
    "id"                SERIAL          PRIMARY KEY,
    "sessionId"         TEXT            NOT NULL UNIQUE,
    "customerName"      TEXT            NOT NULL,
    "customerAddress"   TEXT            NOT NULL,
    "customerEmail"     TEXT,
    "customerPhone"     TEXT,
    "signatureData"     TEXT            NOT NULL,   -- base64 PNG data URL
    "pdfPath"           TEXT,                       -- relative path if stored on disk
    "pdfUrl"            TEXT,                       -- external URL (Google Drive)
    "agreementSnapshot" TEXT            NOT NULL,   -- the exact text they agreed to
    "signedAt"          TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignedAgreement_sessionId_fkey"
        FOREIGN KEY ("sessionId")
        REFERENCES "SigningSession"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =========================================================================
-- SEED: one default agreement template
-- (Delete and re-insert with your actual venue text as needed.)
-- =========================================================================

INSERT INTO "AgreementTemplate" ("name", "content", "updatedAt", "version")
SELECT
    'Standard Waiver',
    'This is a liability release waiver for Songbird Terrace. By signing this, you agree to release us from liability for any accidents or injuries that may occur on the premises.',
    CURRENT_TIMESTAMP,
    1
WHERE NOT EXISTS (SELECT 1 FROM "AgreementTemplate");
