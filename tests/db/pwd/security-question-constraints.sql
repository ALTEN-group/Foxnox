BEGIN;

DO $$
BEGIN
  UPDATE security_question
  SET trans = trans || '{"nl": "Wat was de naam van je eerste huisdier?", "pt-BR": "Qual era o nome do seu primeiro animal de estimação?"}',
      "updaterId" = 9001, "updaterName" = 'db-test'
  WHERE id = 1;

  BEGIN
    UPDATE security_question
    SET trans = '{"EN": "invalid uppercase lang"}',
        "updaterId" = 9001, "updaterName" = 'db-test'
    WHERE id = 1;
    RAISE EXCEPTION 'uppercase security_question.trans lang was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  BEGIN
    UPDATE security_question
    SET trans = jsonb_build_object('en', repeat('x', 256)),
        "updaterId" = 9001, "updaterName" = 'db-test'
    WHERE id = 1;
    RAISE EXCEPTION 'over long security_question.trans value was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  BEGIN
    UPDATE security_question_category
    SET trans = '{"eng": "invalid lang tag"}',
        "updaterId" = 9001, "updaterName" = 'db-test'
    WHERE id = 1;
    RAISE EXCEPTION 'non BCP 47 security_question_category.trans lang was accepted';
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
