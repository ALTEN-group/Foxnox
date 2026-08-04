-- Password table for authentication
CREATE TABLE pwd (
	id SERIAL PRIMARY KEY,
	"userId" INTEGER NOT NULL,
	"pwHash" VARCHAR(255) NOT NULL,
	"pwdResetToken" VARCHAR(150) NULL,
	"pwUpdatedAt" TIMESTAMP,
	"pwExpiry" TIMESTAMP,
	"failedAttempts" INTEGER DEFAULT 0,
	"lockedUntil" TIMESTAMP,
	"lastLoginAt" TIMESTAMP,
	"twoFactorEnabled" BOOLEAN DEFAULT FALSE,
	"twoFactorSecret" VARCHAR(255),
	"recoveryToken" VARCHAR(255),
	"recoveryTokenExpiresAt" TIMESTAMP,
	archived BOOLEAN DEFAULT FALSE,
	"archivedAt" TIMESTAMP,
	"createdAt" TIMESTAMP DEFAULT NOW(),
	"creatorId" INT,
	"creatorName" TEXT,
	"updatedAt" TIMESTAMP NULL,
	"updaterId" INT,
	"updaterName" TEXT
);

-- Index for fast lookup by user_id
CREATE INDEX idx_password_userId ON password("userId");

    