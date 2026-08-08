-- Apply history trigger to user_trusted_device table
CREATE TRIGGER user_trusted_device_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "user_trusted_device"
FOR EACH ROW
EXECUTE PROCEDURE change_trigger();
