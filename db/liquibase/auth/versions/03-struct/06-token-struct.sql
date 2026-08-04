
-- Enable pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Token type reference table
CREATE TABLE IF NOT EXISTS token_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  "defaultExpiryMinutes" INT DEFAULT 30,
  "maxAttempts" INT DEFAULT 3,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT
);

CREATE TABLE IF NOT EXISTS token (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(255) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  "typeId" INT NOT NULL,
  "userId" INT NOT NULL,
  attempts INT DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  "expiresAt" TIMESTAMP NULL, -- Will be set based on token type
  "verifiedAt" TIMESTAMP NULL,
  CONSTRAINT fk_token_type
    FOREIGN KEY ("typeId") REFERENCES token_type (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_token_user
    FOREIGN KEY ("userId") REFERENCES "user" (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
