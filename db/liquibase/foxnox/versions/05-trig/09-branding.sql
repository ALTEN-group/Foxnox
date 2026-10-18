-- Apply history trigger to branding table
CREATE TRIGGER branding_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "branding"
FOR EACH ROW
EXECUTE PROCEDURE iud_history();

-- Stamp updatedAt and clear the URL when a file is stored
CREATE TRIGGER branding_before_update_trigger
BEFORE UPDATE ON "branding"
FOR EACH ROW
EXECUTE PROCEDURE before_branding_update();
