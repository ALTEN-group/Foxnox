BEGIN;

-- enrolled_security_answer: joins the answer to its question and hides archived answers.
DO $$
DECLARE
  question_id integer;
  answer_id integer;
  r record;
BEGIN
  INSERT INTO security_question (question, trans, "categoryId", active, "creatorId", "creatorName")
  VALUES ('dbEnrolledQuestion', '{"en": "Pet?", "fr": "Animal ?"}', 1, TRUE, 9201, 'db-test')
  RETURNING id INTO question_id;

  INSERT INTO user_security_answer ("userId", "questionId", "answerHash", "creatorId", "creatorName")
  VALUES (9201, question_id, 'hash', 9201, 'db-test')
  RETURNING id INTO answer_id;

  SELECT * INTO r FROM enrolled_security_answer WHERE id = answer_id;
  IF r."userId" <> 9201
     OR r."questionId" <> question_id
     OR r."answerHash" <> 'hash'
     OR r.question <> 'dbEnrolledQuestion'
     OR r.trans->>'fr' <> 'Animal ?' THEN
    RAISE EXCEPTION 'enrolled_security_answer: row not joined to its question (%)', r;
  END IF;

  UPDATE user_security_answer
  SET archived = TRUE, "updaterId" = 9201, "updaterName" = 'db-test'
  WHERE id = answer_id;

  IF EXISTS (SELECT 1 FROM enrolled_security_answer WHERE id = answer_id) THEN
    RAISE EXCEPTION 'enrolled_security_answer: archived answer is still listed';
  END IF;
END $$;

ROLLBACK;
