BEGIN;

DO $$
DECLARE
  question_id integer;
BEGIN
  INSERT INTO security_question (question, trans, "categoryId", active, "creatorId", "creatorName")
  VALUES ('dbContractQuestion', '{"en": "Pet?", "fr": "Animal ?"}', 1, TRUE, 9001, 'db-test')
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

  -- Translations travel with the row: one statement, one history entry carrying them
  UPDATE security_question
  SET trans = '{"en": "Pet name?"}',
      "updaterId" = 9003, "updaterName" = 'db-test-trans'
  WHERE id = question_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "tableName" = 'security_question'
      AND operation = 'UPDATE'
      AND "userId" = 9003
      AND (record->>'id')::integer = question_id
      AND record->'trans'->>'en' = 'Pet name?'
      AND record->'trans'->>'fr' IS NULL
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
