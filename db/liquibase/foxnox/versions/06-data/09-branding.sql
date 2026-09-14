
-- Single default branding row (customize via admin UI, falls back to WEB_BRAND_* env if archived)
INSERT INTO branding (name, tagline, mark, "primaryColor", "secondaryColor", "primaryHoverColor", "backgroundColor", "fontFamily", radius, archived, "creatorId", "creatorName") VALUES
	('Foxnox', 'Account security', 'F', '#1f6feb', '#5c6570', '#1858c3', '#f4f6f8', 'system', '12px', FALSE, -1, 'system');
