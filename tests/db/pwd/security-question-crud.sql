BEGIN;

DO $$
DECLARE
  question_id integer;
BEGIN
  INSERT INTO security_question (question, "categoryId", active, "creatorId", "creatorName")
  VALUES ('dbContractQuestion', 1, TRUE, 9001, 'db-test')
  RETURNING id INTO question_id;

  IF NOT EXISTS (
    SELECT 1
    FROM security_question
    WHERE id = question_id
      AND question = 'dbContractQuestion'
      AND "categoryId" = 1
      AND active IS TRUE
      AND archived IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'security_question insert was not readable from the base table';
  END IF;

  UPDATE security_question
  SET active = FALSE, "updaterId" = 9001, "updaterName" = 'db-test'
  WHERE id = question_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'security_question'
      AND operation = 'UPDATE'
      AND "userId" = 9001
      AND (record->>'id')::integer = question_id
  ) THEN
    RAISE EXCEPTION 'security_question changes were not recorded in log.history';
  END IF;

  -- Same statements as src/services/security-question-trans.js
  INSERT INTO security_question_trans ("questionId", lang, trans)
  SELECT * FROM unnest(ARRAY[question_id, question_id], ARRAY['en', 'fr'], ARRAY['Pet?', 'Animal ?'])
  ON CONFLICT ("questionId", lang) DO UPDATE SET trans = EXCLUDED.trans;

  INSERT INTO security_question_trans ("questionId", lang, trans)
  SELECT * FROM unnest(ARRAY[question_id], ARRAY['en'], ARRAY['Pet name?'])
  ON CONFLICT ("questionId", lang) DO UPDATE SET trans = EXCLUDED.trans;

  IF (SELECT trans FROM security_question_trans WHERE "questionId" = question_id AND lang = 'en') <> 'Pet name?' THEN
    RAISE EXCEPTION 'security_question_trans upsert did not update the existing translation';
  END IF;

  DELETE FROM security_question_trans t
  USING unnest(ARRAY[question_id], ARRAY['fr']) AS d("questionId", lang)
  WHERE t."questionId" = d."questionId" AND t.lang = d.lang;

  IF EXISTS (SELECT 1 FROM security_question_trans WHERE "questionId" = question_id AND lang = 'fr') THEN
    RAISE EXCEPTION 'security_question_trans delete did not remove the translation';
  END IF;

  -- The service then touches the question so its history snapshot carries the translations
  UPDATE security_question
  SET "updatedAt" = NOW(), "updaterId" = 9003, "updaterName" = 'db-test-trans'
  WHERE id = question_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "tableName" = 'security_question'
      AND operation = 'UPDATE'
      AND "userId" = 9003
      AND (record->>'id')::integer = question_id
      AND record->>'transEn' = 'Pet name?'
      AND record->>'transFr' = ''
  ) THEN
    RAISE EXCEPTION 'security_question history snapshot does not carry the translations';
  END IF;

  BEGIN
    INSERT INTO security_question (question, "categoryId", "creatorId", "creatorName")
    VALUES ('dbContractQuestionOrphan', 9999, 9001, 'db-test');
    RAISE EXCEPTION 'security_question with an unknown category was accepted';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
