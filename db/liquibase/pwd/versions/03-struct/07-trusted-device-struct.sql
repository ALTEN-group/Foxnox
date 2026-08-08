-- User trusted devices table for 2FA bypass on remembered devices
CREATE TABLE IF NOT EXISTS user_trusted_device (
  id SERIAL PRIMARY KEY,
  "userId" INT NOT NULL,
  "deviceTokenHash" VARCHAR(255) NOT NULL UNIQUE,
  "deviceName" VARCHAR(100) NULL,
  "ipAddress" VARCHAR(45) NULL,
  "userAgent" TEXT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "lastUsedAt" TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  CONSTRAINT fk_user_trusted_device_user
    FOREIGN KEY ("userId") REFERENCES "user" (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Index for fast lookup by userId
CREATE INDEX idx_user_trusted_device_userId ON user_trusted_device("userId");

-- Index for fast lookup by device token hash
CREATE INDEX idx_user_trusted_device_tokenHash ON user_trusted_device("deviceTokenHash");
