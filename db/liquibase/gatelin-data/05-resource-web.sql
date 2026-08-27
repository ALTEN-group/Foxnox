--
-- Web workflow resource (Handlebars SSR pages under /foxnox/web).
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'foxnox'), 'foxnox/web', false, -1, 'system')
ON CONFLICT DO NOTHING;
