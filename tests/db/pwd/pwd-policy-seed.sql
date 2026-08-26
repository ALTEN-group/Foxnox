BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM pwd_policy) = 0 THEN
    RAISE EXCEPTION 'pwd_policy seed did not create any rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pwd_policy
    WHERE name = 'Public User'
      AND "creatorId" = -1
      AND "creatorName" = 'system'
  ) THEN
    RAISE EXCEPTION 'required Public User policy seed is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pwd_policy
    WHERE name = 'High Security'
      AND "creatorId" = -1
      AND "creatorName" = 'system'
  ) THEN
    RAISE EXCEPTION 'required High Security policy seed is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pwd_policy
    WHERE name = 'Standard'
      AND "creatorId" = -1
      AND "creatorName" = 'system'
  ) THEN
    RAISE EXCEPTION 'required Standard policy seed is missing';
  END IF;
END;
$$;

ROLLBACK;
