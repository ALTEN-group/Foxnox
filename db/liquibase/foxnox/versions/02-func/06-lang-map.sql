-- Validates a translations map: BCP 47-ish language keys ('en', 'fr', 'pt-BR', …)
-- and string values of 255 characters at most.
-- Used by the CHECK constraint of security_question.trans (03-struct/04-question.sql).
CREATE OR REPLACE FUNCTION is_lang_map(p JSONB) RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN jsonb_typeof(p) <> 'object' THEN FALSE
    ELSE COALESCE((
      SELECT bool_and(
        e.key ~ '^[a-z]{2}(-[A-Za-z]{2})?$'
        AND jsonb_typeof(e.value) IN ('string', 'null')
        AND length(COALESCE(e.value #>> '{}', '')) <= 255
      )
      FROM jsonb_each(p) AS e
    ), TRUE)
  END;
$$ LANGUAGE sql IMMUTABLE;
