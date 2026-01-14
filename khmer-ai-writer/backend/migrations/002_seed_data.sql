-- Seed users for local/test login
INSERT INTO users (email, password_hash, full_name, tier)
VALUES
    ('demo.free@example.com', '$2a$10$MKWJePeeYvhbIK5Ae6H.XOfIqNXoJN3Z0/J49/DcK4LOtonhvZzze', 'Demo Free', 'free'),
    ('demo.premium@example.com', '$2a$10$MKWJePeeYvhbIK5Ae6H.XOfIqNXoJN3Z0/J49/DcK4LOtonhvZzze', 'Demo Premium', 'premium'),
    ('demo.business@example.com', '$2a$10$MKWJePeeYvhbIK5Ae6H.XOfIqNXoJN3Z0/J49/DcK4LOtonhvZzze', 'Demo Business', 'business')
ON CONFLICT (email) DO NOTHING;
