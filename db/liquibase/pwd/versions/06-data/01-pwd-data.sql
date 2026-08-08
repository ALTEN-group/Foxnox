
-- Mock data for password table
INSERT INTO password (
	"userId",
	"passwordHash",
	"passwordSalt",
	"passwordUpdatedAt",
	"passwordExpiry",
	"failedAttempts",
	"lockedUntil",
	"lastLoginAt",
	"twoFactorEnabled",
	"twoFactorSecret",
	"recoveryToken",
	"recoveryTokenExpiresAt",
	archived,
	"archivedAt"
) VALUES
	(1, 'hashed_pwd_1', 'salt1', '2025-09-01 10:00:00', '2026-09-01 10:00:00', 0, NULL, '2025-09-20 08:00:00', FALSE, NULL, NULL, NULL, FALSE, NULL),
	(2, 'hashed_pwd_2', 'salt2', '2025-08-15 09:30:00', '2026-08-15 09:30:00', 2, '2025-09-29 12:00:00', '2025-09-28 07:45:00', TRUE, '2fa_secret_2', 'recovery_token_2', '2025-10-01 00:00:00', FALSE, NULL),
	(3, 'hashed_pwd_3', 'salt3', '2025-07-10 14:20:00', '2026-07-10 14:20:00', 0, NULL, '2025-09-25 16:30:00', FALSE, NULL, NULL, NULL, TRUE, '2025-09-29 15:00:00');
