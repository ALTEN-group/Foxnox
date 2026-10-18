BEGIN;

-- before_branding_update: stamps updatedAt and a newly stored image file
-- replaces its URL alternative.
DO $$
DECLARE
  v_id INT;
  v_row branding%ROWTYPE;
BEGIN
  INSERT INTO branding (name, "logoUrl", "faviconUrl", "creatorId", "creatorName")
  VALUES ('db-test', 'https://x.test/logo.svg', 'https://x.test/favicon.svg', 9001, 'db-test')
  RETURNING id INTO v_id;

  -- storing a logo file clears logoUrl only, and stamps updatedAt
  UPDATE branding
  SET "logoFile" = 'logo-a.png', "updaterId" = 9002, "updaterName" = 'db-test'
  WHERE id = v_id;
  SELECT * INTO v_row FROM branding WHERE id = v_id;
  IF v_row."logoUrl" <> '' THEN
    RAISE EXCEPTION 'logoUrl was not cleared when a logo file was stored';
  END IF;
  IF v_row."faviconUrl" = '' THEN
    RAISE EXCEPTION 'faviconUrl was cleared by a logo upload';
  END IF;
  IF v_row."updatedAt" IS NULL THEN
    RAISE EXCEPTION 'updatedAt was not stamped';
  END IF;

  -- a URL typed afterwards wins over the stored file (file left untouched)
  UPDATE branding
  SET "logoUrl" = 'https://x.test/other.svg', "updaterId" = 9002, "updaterName" = 'db-test'
  WHERE id = v_id;
  SELECT * INTO v_row FROM branding WHERE id = v_id;
  IF v_row."logoUrl" <> 'https://x.test/other.svg' OR v_row."logoFile" <> 'logo-a.png' THEN
    RAISE EXCEPTION 'an unchanged logoFile must not clear a typed logoUrl';
  END IF;

  -- removing the file does not touch the URL
  UPDATE branding
  SET "logoFile" = '', "updaterId" = 9002, "updaterName" = 'db-test'
  WHERE id = v_id;
  SELECT * INTO v_row FROM branding WHERE id = v_id;
  IF v_row."logoUrl" <> 'https://x.test/other.svg' THEN
    RAISE EXCEPTION 'removing the file must keep logoUrl';
  END IF;

  -- same rule for the favicon
  UPDATE branding
  SET "faviconFile" = 'favicon-a.png', "updaterId" = 9002, "updaterName" = 'db-test'
  WHERE id = v_id;
  SELECT * INTO v_row FROM branding WHERE id = v_id;
  IF v_row."faviconUrl" <> '' THEN
    RAISE EXCEPTION 'faviconUrl was not cleared when a favicon file was stored';
  END IF;
END $$;

ROLLBACK;
