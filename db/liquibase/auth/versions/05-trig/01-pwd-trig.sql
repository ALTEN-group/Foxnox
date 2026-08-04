-- Apply history trigger to pwd table
CREATE TRIGGER pwd_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "pwd"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();
