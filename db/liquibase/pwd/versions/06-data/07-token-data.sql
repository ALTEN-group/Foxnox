
-- Insert default token types
INSERT INTO token_type (name, description, "defaultExpiryMinutes", "maxAttempts") VALUES
('Email verification', 'Token for verifying primary email address', 30, 5), -- 24 hours
('Backup email verification', 'Token for verifying backup email address', 45, 5), -- 24 hours  
('Password reset', 'Token for resetting user password', 30, 3)
;
