
-- Mock data for password_policies table
INSERT INTO password_policies (
	"applicationId",
	name,
	minLength,
	requireUppercase,
	requireLowercase,
	requireNumber,
	requireSpecialChar,
	maxAttempts,
	expiryDays,
	archived,
	"archivedAt"
) VALUES
	(1, 'Default Policy', 8, TRUE, TRUE, TRUE, FALSE, 5, 90, FALSE, NULL),
	(2, 'Strict Policy', 12, TRUE, TRUE, TRUE, TRUE, 3, 60, FALSE, NULL);
