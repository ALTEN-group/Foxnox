
-- Insert default token types
INSERT INTO token_type (name, description, ttl, "maxAttempts", "creatorId", "creatorName") VALUES
('Email verification', 'Token for verifying primary email address', 1440, 5, -1, 'system'), -- 24 hours
('Backup email verification', 'Token for verifying backup email address', 1440, 5, -1, 'system'), -- 24 hours  
('Password reset', 'Token for resetting user password', 30, 3, -1, 'system'),
('Account recovery', 'Token for 2FA or account recovery', 60, 3, -1, 'system'),
('Account unlock', 'Token for unlocking a locked account after failed attempts', 30, 3, -1, 'system'),
('2FA challenge', 'Pending login step: verify TOTP before session is issued', 10, 5, -1, 'system'),
('Expired password challenge', 'Pending login step: force password change after pwdExpiry', 15, 3, -1, 'system'),
('Trusted device challenge', 'Pending login step: optional remember-this-device consent', 10, 3, -1, 'system'),
('Login resume', 'One-shot ticket to finish Gatelin session after mid-login challenges', 10, 1, -1, 'system')
;
