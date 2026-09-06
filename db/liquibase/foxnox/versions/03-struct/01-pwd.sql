-- Password table for authentication
-- TIMESTAMPTZ everywhere: the app writes UTC instants (Date#toISOString) while the
-- containers run a local TZ, so a naive TIMESTAMP would store the UTC wall clock and
-- then be compared against a local NOW().
CREATE TABLE pwd (
	id SERIAL PRIMARY KEY,
	"userId" INTEGER NOT NULL,
	"pwdHash" VARCHAR(255) NOT NULL,
	"pwdUpdatedAt" TIMESTAMPTZ DEFAULT NOW(),
	"pwdExpiry" TIMESTAMPTZ,
	"failedAttempts" INTEGER DEFAULT 0,
	"lockedUntil" TIMESTAMPTZ,
	"lastLoginAt" TIMESTAMPTZ,
	"twoFactorEnabled" BOOLEAN DEFAULT FALSE,
	"twoFactorSecret" VARCHAR(255),
	archived BOOLEAN DEFAULT FALSE,
	"archivedAt" TIMESTAMPTZ,
	"createdAt" TIMESTAMPTZ DEFAULT NOW(),
	"creatorId" INT,
	"creatorName" TEXT,
	"updatedAt" TIMESTAMPTZ NULL,
	"updaterId" INT,
	"updaterName" TEXT
);

-- Index for fast lookup by user_id
CREATE INDEX idx_pwd_userId ON pwd("userId");

