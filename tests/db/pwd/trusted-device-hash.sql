BEGIN;

DO $$
BEGIN
  INSERT INTO user_trusted_device (
    "userId",
    "deviceTokenHash",
    "expiresAt",
    "creatorId",
    "creatorName"
  )
  VALUES (
    9001,
    'db-test-device-hash',
    NOW() + INTERVAL '30 days',
    9001,
    'db-test'
  );

  BEGIN
    INSERT INTO user_trusted_device (
      "userId",
      "deviceTokenHash",
      "expiresAt",
      "creatorId",
      "creatorName"
    )
    VALUES (
      9002,
      'db-test-device-hash',
      NOW() + INTERVAL '30 days',
      9001,
      'db-test'
    );
    RAISE EXCEPTION 'duplicate user_trusted_device deviceTokenHash was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
