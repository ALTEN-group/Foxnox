-- Apply history trigger to pwd table
CREATE TRIGGER pwd_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "pwd"
FOR EACH ROW
EXECUTE PROCEDURE iud_history();

-- Reject a pwdExpiry before tomorrow (UTC); function in 02-func/04-pwd-expiry.sql
CREATE TRIGGER pwd_expiry_guard_trigger
BEFORE INSERT OR UPDATE OF "pwdExpiry" ON "pwd"
FOR EACH ROW
EXECUTE PROCEDURE pwd_expiry_guard();
