-- Stamps every branding update and enforces the image either/or rule: a newly
-- stored logo/favicon file replaces its URL alternative.
-- Used by branding_before_update_trigger (05-trig/09-branding.sql).
CREATE OR REPLACE FUNCTION before_branding_update() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" := NOW();
  IF NEW."logoFile" <> '' AND NEW."logoFile" IS DISTINCT FROM OLD."logoFile" THEN
    NEW."logoUrl" := '';
  END IF;
  IF NEW."faviconFile" <> '' AND NEW."faviconFile" IS DISTINCT FROM OLD."faviconFile" THEN
    NEW."faviconUrl" := '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
