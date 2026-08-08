-- Supported translation languages
CREATE TYPE language AS ENUM ('en', 'fr', 'es', 'de', 'it', 'pt');

-- Security question categories
CREATE TABLE IF NOT EXISTS security_question_category (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'personal', 'family', 'education', 'work'
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT
);

-- Security question category translations
CREATE TABLE IF NOT EXISTS security_question_category_trans (
  "categoryId" INT NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(255) NOT NULL,
  PRIMARY KEY ("categoryId", lang),
  CONSTRAINT fk_security_question_category_trans
    FOREIGN KEY ("categoryId") REFERENCES security_question_category (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Security questions for account recovery
CREATE TABLE IF NOT EXISTS security_question (
  id SERIAL PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  "categoryId" INT NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  CONSTRAINT fk_security_question_category
    FOREIGN KEY ("categoryId") REFERENCES security_question_category (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Security question translations
CREATE TABLE IF NOT EXISTS security_question_trans (
  "questionId" INT NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(255) NOT NULL,
  PRIMARY KEY ("questionId", lang),
  CONSTRAINT fk_security_question_trans
    FOREIGN KEY ("questionId") REFERENCES security_question (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- User's answers to security questions
CREATE TABLE IF NOT EXISTS user_security_answer (
  id SERIAL PRIMARY KEY,
  "userId" INT NOT NULL,
  "questionId" INT NOT NULL,
  "answerHash" VARCHAR(255) NOT NULL, -- bcrypt hash of the answer
  UNIQUE ("userId", "questionId"), -- One answer per question per user
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMP NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  CONSTRAINT fk_user_security_answer_question
    FOREIGN KEY ("questionId") REFERENCES security_question (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
