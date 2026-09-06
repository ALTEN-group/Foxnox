
-- Enable pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Token type reference table
CREATE TABLE IF NOT EXISTS token_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  ttl INT DEFAULT 30,
  "maxAttempts" INT DEFAULT 3,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMPTZ NULL,
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
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMPTZ NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  -- Set from token_type.ttl by the app, as a UTC instant. TIMESTAMPTZ is required:
  -- a naive TIMESTAMP drops the offset, so every TTL shorter than the local UTC
  -- offset would be in the past the moment the row is written.
  "expiresAt" TIMESTAMPTZ NULL,
  "verifiedAt" TIMESTAMPTZ NULL,
  CONSTRAINT fk_token_type
    FOREIGN KEY ("typeId") REFERENCES token_type (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
