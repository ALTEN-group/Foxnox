BEGIN;

DO $$
BEGIN
  INSERT INTO security_question_trans ("questionId", lang, trans)
  VALUES (1, 'nl', 'Wat was de naam van je eerste huisdier?');

  INSERT INTO security_question_trans ("questionId", lang, trans)
  VALUES (1, 'pt-BR', 'Qual era o nome do seu primeiro animal de estimação?');

  BEGIN
    INSERT INTO security_question_trans ("questionId", lang, trans)
    VALUES (1, 'EN', 'invalid uppercase lang');
    RAISE EXCEPTION 'uppercase security_question_trans lang was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO security_question_category_trans ("categoryId", lang, trans)
    VALUES (1, 'eng', 'invalid lang tag');
    RAISE EXCEPTION 'non BCP 47 security_question_category_trans lang was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  INSERT INTO user_security_answer (
    "userId",
    "questionId",
    "answerHash",
    "creatorId",
    "creatorName"
  )
  VALUES (
    9001,
    1,
    'db-test-answer-hash',
    9001,
    'db-test'
  );

  BEGIN
    INSERT INTO user_security_answer (
      "userId",
      "questionId",
      "answerHash",
      "creatorId",
      "creatorName"
    )
    VALUES (
      9001,
      1,
      'db-test-answer-hash-2',
      9001,
      'db-test'
    );
    RAISE EXCEPTION 'duplicate user_security_answer (userId, questionId) was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
