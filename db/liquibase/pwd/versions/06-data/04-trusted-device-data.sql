
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
	(1, 'device_hash_1', 'Chrome on MacBook Pro', '192.168.1.10', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-09-01 10:00:00', FALSE, NULL, -1, 'system'),
	(2, 'device_hash_2', 'Safari on iPhone', '10.0.0.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', '2026-08-15 09:30:00', FALSE, NULL, -1, 'system'),
	(3, 'device_hash_3', 'Firefox on Windows', '172.16.0.3', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/115.0', '2025-10-01 00:00:00', TRUE, '2025-09-29 15:00:00', -1, 'system')
ON CONFLICT ("deviceTokenHash") DO NOTHING;

ANALYZE user_trusted_device;
