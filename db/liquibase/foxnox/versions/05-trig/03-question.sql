-- Apply history trigger to security_question_category table
CREATE TRIGGER security_question_category_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "security_question_category"
FOR EACH ROW
EXECUTE PROCEDURE iud_history();

-- History of security_question. The snapshot also carries the en/fr translations
-- (transEn / transFr, same names as the admin fields) so the question history shows
-- translation changes. The app touches the question row after saving translations
-- (src/services/security-question-trans.js), which fires this trigger.
CREATE OR REPLACE FUNCTION iud_security_question_history() RETURNS trigger AS $$
DECLARE
  v_row security_question%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
  ELSE
    v_row := NEW;
  END IF;
  PERFORM public.log_history(
    TG_TABLE_SCHEMA,
    TG_RELNAME,
    TG_OP,
    (
      to_jsonb(v_row) || jsonb_build_object(
        'transEn', COALESCE((SELECT trans FROM public.security_question_trans WHERE "questionId" = v_row.id AND lang = 'en'), ''),
        'transFr', COALESCE((SELECT trans FROM public.security_question_trans WHERE "questionId" = v_row.id AND lang = 'fr'), '')
      )
    )::json
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public;

CREATE TRIGGER security_question_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "security_question"
FOR EACH ROW
EXECUTE PROCEDURE iud_security_question_history();

-- Apply history trigger to user_security_answer table
CREATE TRIGGER user_security_answer_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "user_security_answer"
FOR EACH ROW
EXECUTE PROCEDURE iud_history();
