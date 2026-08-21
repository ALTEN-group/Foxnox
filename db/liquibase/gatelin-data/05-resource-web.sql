--
-- Web workflow resource (Handlebars SSR pages under /pwd/web).
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'foxnox'), 'pwd/web', false, -1, 'system')
ON CONFLICT DO NOTHING;
