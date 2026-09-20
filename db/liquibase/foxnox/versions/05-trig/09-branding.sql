-- Apply history trigger to branding table
CREATE TRIGGER branding_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "branding"
FOR EACH ROW
EXECUTE PROCEDURE iud_history();
