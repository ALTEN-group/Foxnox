
-- Password policies for various security levels
INSERT INTO pwd_policy (name, description, length, number, symbol, "lowerCase", "upperCase", "strict", symbols, "expiryDays", "maxFailedAttempts", "lockoutMinutes", archived, "creatorId", "creatorName") VALUES
	('Public User',   'Default password policy for regular users',              10, TRUE, TRUE, TRUE, TRUE, TRUE, '!@#%*_-+=:?><./()',   0, 5, 15, FALSE, -1, 'system'),
	('High Security', 'Strong password policy for sensitive accounts in admin', 12, TRUE, TRUE, TRUE, TRUE, TRUE, '!@#%*_-+=:?><./()$£', 0, 5, 15, FALSE, -1, 'system'),
	('Standard',      'Default password policy for regular users in admin',     12, TRUE, TRUE, TRUE, TRUE, TRUE, '!@#%*_-+=:?><./()$',  0, 5, 15, FALSE, -1, 'system');
