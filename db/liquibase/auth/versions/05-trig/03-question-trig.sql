-- Apply history trigger to security_question_category table
CREATE TRIGGER security_question_category_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "security_question_category"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();

-- Apply history trigger to security_question table
CREATE TRIGGER security_question_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "security_question"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();

-- Apply history trigger to user_security_answer table
CREATE TRIGGER user_security_answer_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "user_security_answer"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();
