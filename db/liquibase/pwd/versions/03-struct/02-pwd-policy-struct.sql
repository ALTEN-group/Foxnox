
CREATE TABLE IF NOT EXISTS pwd_policy (
  id SERIAL PRIMARY KEY,
  "appId" INT NOT NULL,
  name varchar(50) NOT NULL,
  description varchar(100) NULL,
  length INT DEFAULT 12 NOT NULL,
  number BOOLEAN DEFAULT TRUE NOT NULL,
  symbol BOOLEAN DEFAULT TRUE NOT NULL,
  "lowerCase" BOOLEAN DEFAULT TRUE NOT NULL,
  "upperCase" BOOLEAN DEFAULT TRUE NOT NULL,
  "strict" BOOLEAN DEFAULT TRUE NOT NULL,
  symbols varchar(50) DEFAULT '!@#%*_-+=:?><./()' NOT NULL,
  "expiryDays" INT DEFAULT 90,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  archived BOOLEAN DEFAULT FALSE,  
  "archivedAt" TIMESTAMP DEFAULT NULL,  
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  CHECK ("appId">=0),
  CHECK (length > 5),
  CHECK (number = TRUE OR symbol = TRUE OR "lowerCase" = TRUE OR "upperCase" = TRUE),
  CONSTRAINT fk_password_policy_application
    FOREIGN KEY ("appId") REFERENCES application (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);