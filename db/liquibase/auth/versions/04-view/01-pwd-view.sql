
-- password_policies view
create or replace view pwd_policies AS
  WITH history AS (
    SELECT * FROM get_history('public', 'pwd_policy')
  )
  SELECT pp.id,
    pp."appId",
    a.name AS "appName",
    pp.name,
    pp.description,
    pp.length,
    pp.number,
    pp.symbol,
    pp."lowerCase",
    pp."upperCase",
    pp."strict",
    pp.symbols,
    pp."expiryDays",
    NULL AS "consumerId",
    NULL AS "consumerName",
    pp.active,
    pp.archived,
    pp."archivedAt",
    h."consumerId" AS "updaterId",
    h."consumerName" AS "updaterName",
    h.tstamp AS "updatedAt",
    h2.tstamp AS "createdAt",
    h2."consumerId" AS "creatorId",
    h2."consumerName" AS "creatorName",
    CASE 
      WHEN pp."expiryDays" IS NULL OR pp."expiryDays" <= 0 THEN NULL::TIMESTAMP 
      ELSE h2.tstamp + (pp."expiryDays" * INTERVAL '1 day')
    END AS "expiryDate"
  FROM pwd_policy AS pp
  LEFT JOIN application AS a ON a.id = pp."appId"
  LEFT JOIN history h ON (h.id,h.operation) = (pp.id, 'UPDATE')
  LEFT JOIN history h2 ON (h2.id,h2.operation) = (pp.id, 'INSERT')
  GROUP BY pp.id, a.id, h.tstamp, h."consumerId",h."consumerName",h2.tstamp, h2."consumerId",h2."consumerName"
  ORDER BY pp.id ASC
;

--
-- Apply insert, update, delete role trigger  
--
CREATE TRIGGER pwd_policies_iud_trigger
INSTEAD OF INSERT OR UPDATE ON "pwd_policies"
FOR EACH ROW EXECUTE PROCEDURE iud_password_policy();