
-- Mock data for user_trusted_device table
INSERT INTO user_trusted_device (
	"userId",
	"deviceTokenHash",
	"deviceName",
	"ipAddress",
	"userAgent",
	"expiresAt",
	archived,
	"archivedAt",
	"creatorId",
	"creatorName"
) VALUES
	(1, 'k3Jv9QnZ2mLRxTgYb7Fh0Wd_pAeCoU1sN4iVtXyKdEc', 'Chrome on MacBook Pro', '192.168.1.10', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-09-01 10:00:00', FALSE, NULL, -1, 'system'),
	(2, 'r8Bn4WpLk1QzXeYtCmVoU6dFgS0aHj9NrTiZbXqPvKs', 'Safari on iPhone', '10.0.0.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', '2026-11-15 09:30:00', FALSE, NULL, -1, 'system'),
	(3, 'f2LmZ7QxRvKtNc9DoWaHb3YsUj1EpGiVnXyTq0MfSdA', 'Firefox on Windows', '172.16.0.3', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/115.0', '2025-10-01 00:00:00', TRUE, '2025-09-29 15:00:00', -1, 'system'),
	(4, 'h9VtRq2XkLmYbNc5FpZoU8dWaSj0EiCvXyTn4QfGdMs', 'Edge on Windows', '203.0.113.7', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/126.0', '2026-10-10 14:00:00', FALSE, NULL, -1, 'system'),
	(5, 'w4QnKp7ZvLmXbTc1DoRaHj9SuY0EiGvNyXq3MfWdAs2', 'Chrome on Pixel 8', '198.51.100.22', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36', '2026-09-20 08:15:00', FALSE, NULL, -1, 'system')
ON CONFLICT ("deviceTokenHash") DO NOTHING;

ANALYZE user_trusted_device;
