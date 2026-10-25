-- Security question categories
CREATE TABLE IF NOT EXISTS security_question_category (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'personal', 'family', 'education', 'work'
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMPTZ NULL,
  "updaterId" INT,
  "updaterName" TEXT
);

-- Security question category translations
CREATE TABLE IF NOT EXISTS security_question_category_trans (
  "categoryId" INT NOT NULL,
  lang VARCHAR(5) NOT NULL, -- BCP 47-ish: 'en', 'fr', 'pt-BR', …
  trans VARCHAR(255) NOT NULL,
  PRIMARY KEY ("categoryId", lang),
  CONSTRAINT chk_security_question_category_trans_lang
    CHECK (lang ~ '^[a-z]{2}(-[A-Za-z]{2})?$'),
  CONSTRAINT fk_security_question_category_trans
    FOREIGN KEY ("categoryId") REFERENCES security_question_category (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Security questions for account recovery
CREATE TABLE IF NOT EXISTS security_question (
  id SERIAL PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  -- Localized question texts keyed by language: {"en": "…", "fr": "…"}.
  -- Kept on the row itself so the question stays a plain entity (standard CRUD,
  -- history and archival); `question` is the fallback when a language is missing.
  trans JSONB NOT NULL DEFAULT '{}'::jsonb,
  "categoryId" INT NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMPTZ NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  CONSTRAINT chk_security_question_trans CHECK (is_lang_map(trans)),
  CONSTRAINT fk_security_question_category
    FOREIGN KEY ("categoryId") REFERENCES security_question_category (id)
    ON DELETE RESTRICT
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
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMPTZ NULL,
  "updaterId" INT,
  "updaterName" TEXT,
  CONSTRAINT fk_user_security_answer_question
    FOREIGN KEY ("questionId") REFERENCES security_question (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
