-- Workflow tokens are minted by Node as UTC instants (Date#toISOString) while the
-- containers run a local timezone. On a naive TIMESTAMP column the offset is dropped,
-- so every TTL shorter than the local UTC offset lands in the past and the challenge
-- page reports "this sign-in step is no longer valid" on the very first click.
BEGIN;

SET LOCAL TIME ZONE 'Europe/Paris';

DO $$
DECLARE
  type_id integer;
  ttl_minutes integer;
  utc_expiry text;
  token_id integer;
  stored_ttl interval;
BEGIN
  SELECT id, ttl INTO STRICT type_id, ttl_minutes
  FROM token_type
  WHERE name = '2FA challenge';

  utc_expiry := to_char(
    timezone('UTC', now()) + make_interval(mins => ttl_minutes),
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  -- Sent as an untyped string literal, exactly like the driver does, so the column
  -- type is what decides whether the trailing Z is honoured or dropped.
  EXECUTE format(
    'INSERT INTO token (hash, "typeId", "userId", attempts, "expiresAt", "creatorId", "creatorName")
     VALUES (%L, %s, 9001, 0, %L, -1, ''system'') RETURNING id',
    'db-test-token-expiry-tz',
    type_id,
    utc_expiry
  ) INTO token_id;

  SELECT "expiresAt" - "createdAt" INTO stored_ttl FROM token WHERE id = token_id;

  IF stored_ttl < make_interval(mins => ttl_minutes) - INTERVAL '1 minute' THEN
    RAISE EXCEPTION
      'token expiry lost its UTC offset: stored TTL is %, expected about % minutes',
      stored_ttl, ttl_minutes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM token WHERE id = token_id AND "expiresAt" > NOW()
  ) THEN
    RAISE EXCEPTION 'freshly minted token is already expired under a non-UTC session timezone';
  END IF;
END;
$$;

ROLLBACK;
