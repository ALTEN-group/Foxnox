
-- Insert default token types
INSERT INTO token_type (name, description, ttl, "maxAttempts") VALUES
('Email verification', 'Token for verifying primary email address', 1440, 5), -- 24 hours
('Backup email verification', 'Token for verifying backup email address', 1440, 5), -- 24 hours  
('Password reset', 'Token for resetting user password', 30, 3),
('Account recovery', 'Token for 2FA or account recovery', 60, 3),
('Account unlock', 'Token for unlocking a locked account after failed attempts', 30, 3),
('2FA challenge', 'Pending login step: verify TOTP before session is issued', 10, 5),
('Expired password challenge', 'Pending login step: force password change after pwdExpiry', 15, 3),
('Trusted device challenge', 'Pending login step: optional remember-this-device consent', 10, 3),
('Login resume', 'One-shot ticket to finish Gatelin session after mid-login challenges', 10, 1)
;
