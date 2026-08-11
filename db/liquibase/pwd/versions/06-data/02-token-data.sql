
-- Insert default token types
INSERT INTO token_type (name, description, ttl, "maxAttempts") VALUES
('Email verification', 'Token for verifying primary email address', 1440, 5), -- 24 hours
('Backup email verification', 'Token for verifying backup email address', 1440, 5), -- 24 hours  
('Password reset', 'Token for resetting user password', 30, 3),
('Account recovery', 'Token for 2FA or account recovery', 60, 3)
;
