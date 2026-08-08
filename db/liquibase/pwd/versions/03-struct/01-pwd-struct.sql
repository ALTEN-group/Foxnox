-- Password table for authentication
CREATE TABLE pwd (
	id SERIAL PRIMARY KEY,
	"userId" INTEGER NOT NULL,
	"pwdHash" VARCHAR(255) NOT NULL,
	"pwdUpdatedAt" TIMESTAMP,
	"pwdExpiry" TIMESTAMP,
	"failedAttempts" INTEGER DEFAULT 0,
	"lockedUntil" TIMESTAMP,
	"lastLoginAt" TIMESTAMP,
	"twoFactorEnabled" BOOLEAN DEFAULT FALSE,
	"twoFactorSecret" VARCHAR(255),
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
CREATE INDEX idx_pwd_userId ON pwd("userId");

    