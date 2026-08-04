-- Apply history trigger to token_type table
CREATE TRIGGER token_type_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "token_type"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();

-- Apply history trigger to token table
CREATE TRIGGER token_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "token"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();
