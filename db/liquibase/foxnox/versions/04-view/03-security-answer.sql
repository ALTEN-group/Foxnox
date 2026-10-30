-- Read model for the web setup and recovery pages: the non-archived answers a user
-- has enrolled, joined to their question. The label language is resolved by the
-- service layer from `trans`, with `question` as the fallback.
--
-- answerHash is for the service layer only (see src/entities/enrolled-security-answer.js).
CREATE OR REPLACE VIEW enrolled_security_answer AS
  SELECT
    a.id,
    a."userId",
    a."questionId",
    a."answerHash",
    q.question,
    q.trans
  FROM user_security_answer AS a
  JOIN security_question AS q ON q.id = a."questionId"
  WHERE a.archived IS NOT TRUE
;
