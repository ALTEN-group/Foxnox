
-- Create trigger function to insert, update, delete a password_policy
CREATE OR REPLACE FUNCTION iud_password_policy() RETURNS trigger AS $$
  DECLARE
    m   int;
  BEGIN
    IF TG_OP = 'INSERT' THEN
      insert into "password_policy" (
        "appId", name, description, length, number, symbol, "lowerCase", "upperCase", "strict", symbols, "expiryDays", active, archived)
      VALUES (
        NEW."appId",
        NEW.name,
        NEW.description,
        NEW.length,
        NEW.number,
        NEW.symbol,
        NEW."lowerCase",
        NEW."upperCase",
        NEW."strict",
        NEW.symbols,
        NEW."expiryDays",
        NEW.active,
        NEW.archived)
      RETURNING id INTO NEW.id;
      PERFORM log_history(TG_TABLE_SCHEMA, TG_RELNAME, TG_OP, row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      update "password_policy" 
      set 
        "appId" = COALESCE(NEW."appId", "appId"),
        name = COALESCE(NEW.name, name),
        description = COALESCE(NEW.description, description),
        length = COALESCE(NEW.length, length),
        number = COALESCE(NEW.number, number),
        symbol = COALESCE(NEW.symbol, symbol),
        "lowerCase" = COALESCE(NEW."lowerCase", "lowerCase"),
        "upperCase" = COALESCE(NEW."upperCase", "upperCase"),
        "strict" = COALESCE(NEW."strict", "strict"),
        symbols = COALESCE(NEW.symbols, symbols),
        "expiryDays" = COALESCE(NEW."expiryDays", "expiryDays")
      where id = NEW.id;
      PERFORM soft_delete('password_policy', NEW.id, NEW.archived, OLD.archived);
      PERFORM log_history(TG_TABLE_SCHEMA, TG_RELNAME, TG_OP, row_to_json(NEW));
      RETURN NEW;
    END IF;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
