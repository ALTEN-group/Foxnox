CREATE OR REPLACE VIEW preferences AS
  SELECT
    p.id,
    p."userId",
    p."resourceName",
    p.name,
    p.conf,
    (p."userId" IS NULL) AS locked,
    false AS "isActive", -- write-only: set true on UPDATE to select this preference for the acting user (see iud_preference())
    p."createdAt",
    p."creatorId",
    p."creatorName",
    p."updatedAt",
    p."updaterId",
    p."updaterName"
  FROM preference AS p
  ORDER BY p.id ASC
;
