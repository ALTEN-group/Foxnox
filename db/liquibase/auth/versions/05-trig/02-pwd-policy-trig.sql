-- Apply history trigger to pwd_policy table
CREATE TRIGGER pwd_policy_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "pwd_policy"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();
