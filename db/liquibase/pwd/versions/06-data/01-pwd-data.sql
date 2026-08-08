
-- Mock data for password table
INSERT INTO pwd (
	"userId",
	"pwdHash",
	"pwdUpdatedAt",
	"pwdExpiry",
	"failedAttempts",
	"lockedUntil",
	"lastLoginAt",
	"twoFactorEnabled",
	"twoFactorSecret",
	archived,
	"archivedAt"
) VALUES
	(1, 'hashed_pwd_1', '2025-09-01 10:00:00', '2026-09-01 10:00:00', 0, NULL, '2025-09-20 08:00:00', FALSE, NULL, FALSE, NULL),
	(2, 'hashed_pwd_2', '2025-08-15 09:30:00', '2026-08-15 09:30:00', 2, '2025-09-29 12:00:00', '2025-09-28 07:45:00', TRUE, '2fa_secret_2', FALSE, NULL),
	(3, 'hashed_pwd_3', '2025-07-10 14:20:00', '2026-07-10 14:20:00', 0, NULL, '2025-09-25 16:30:00', FALSE, NULL, TRUE, '2025-09-29 15:00:00');


