
--
-- default inserts
--

INSERT INTO application (name, url) VALUES 
('gateway-admin', 'https://gateway-admin.example.com'),
('user-admin', 'https://user-admin.example.com'),
('ookonva-admin', 'https://ookonva-admin.example.com'),
('ookonva-mobile', 'https://ookonva-mobile.example.com'),
('ookonva-web', 'https://ookonva-web.example.com')
;


INSERT INTO operation (name, description, key) VALUES 
('Read', 'Can read only', 'read'),
('Edit', 'Can read and edit', 'edit'),
('Add/Archive', 'Can read, edit, add and archive', 'add_archive'),
('Delete', 'Can delete', 'delete')
;


INSERT INTO functionality ("appId", name, description, key) VALUES 
(1, 'services', 'Services management', 'services'),
(1, 'routes', 'Routes management', 'routes'),
(1, 'consumers', 'Consumers management', 'consumers'),
(2, 'users', 'Users management', 'users'),
(2, 'roles', 'Roles management', 'roles'),
(3, 'mails', 'Mails management', 'mails'),
(3, 'events', 'Events management', 'events')
;


INSERT INTO access ("functionalityId", "operationId", "routeId") VALUES 
('1', '1', '8'),
('1', '2', '8'),
('1', '2', '9'),
('1', '2', '10'),
('1', '2', '11'),
('1', '3', '8'),
('1', '3', '9'),
('1', '3', '10'),
('1', '3', '11'),
('1', '3', '12'),
('1', '3', '13'),
('1', '4', '14'),

('2', '1', '15'),
('2', '1', '16'),
('2', '2', '15'),
('2', '2', '16'),
('2', '2', '17'),
('2', '2', '18'),
('2', '3', '15'),
('2', '3', '16'),
('2', '3', '17'),
('2', '3', '18'),
('2', '3', '19'),
('2', '3', '20'),
('2', '4', '21'),
('2', '4', '22')
;


INSERT INTO attribute ("functionalityId", name) VALUES 
(1, 'active')
;


-- Insert into the roles view
INSERT INTO roles ("appId", name, description, color, level, "default", "permissionsJsonAgg", "consumerId", "consumerName") VALUES 
(2, 'Super Admin', 'Highest privileges', 'crimson', 1,  FALSE, '[{"functionality": 1, "operation": 3, "attributes": []}, {"functionality": 2, "operation": 3, "attributes": []}, {"functionality": 3, "operation": 3, "attributes": []}, {"functionality": 4, "operation": 3, "attributes": []}]', 1, 'System'),
(2, 'Admin',       'Admin privileges',   'orange',  2,  FALSE, '[{"functionality": 1, "operation": 3, "attributes": []}, {"functionality": 2, "operation": 3, "attributes": []}, {"functionality": 3, "operation": 3, "attributes": []}, {"functionality": 4, "operation": 3, "attributes": []}]', 1, 'System')
;


-- Password policies for various security levels
-- This is a view insert, so we need to keep the consumer fields
INSERT INTO password_policies ("appId", name, description, length, number, symbol, "lowerCase", "upperCase", "strict", symbols, "expiryDays", active, archived, "consumerId", "consumerName") VALUES
(2, 'Public User',   'Default password policy for regular users',              10, TRUE, TRUE, TRUE, TRUE, TRUE, '!@#%*_-+=:?><./()',   0, TRUE, FALSE, 1, 'System'),
(1, 'High Security', 'Strong password policy for sensitive accounts in admin', 12, TRUE, TRUE, TRUE, TRUE, TRUE, '!@#%*_-+=:?><./()$£', 0, TRUE, FALSE, 1, 'System'),
(1, 'Standard',      'Default password policy for regular users in admin',     12, TRUE, TRUE, TRUE, TRUE, TRUE, '!@#%*_-+=:?><./()$',  0, TRUE, FALSE, 1, 'System')
;

-- Remove cleanup of session consumer variables as they are no longer used
-- This is the end of the initial data file