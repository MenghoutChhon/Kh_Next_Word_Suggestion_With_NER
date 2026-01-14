-- Khmer AI Writer database schema (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    tier VARCHAR(20) DEFAULT 'free',
    current_team_id UUID,
    scans_limit INTEGER DEFAULT 10,
    scans_used INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 100,
    api_calls_used INTEGER DEFAULT 0,
    storage_limit BIGINT DEFAULT 1073741824,
    storage_used BIGINT DEFAULT 0,
    reports_generated INTEGER DEFAULT 0,
    usage_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    mfa_backup_codes TEXT,
    privacy_settings JSONB,
    notification_settings JSONB,
    subscription_status VARCHAR(20),
    subscription_end_date TIMESTAMP,
    tier_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (optional)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

-- API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[],
    rate_limit_per_hour INTEGER DEFAULT 100,
    requests_used_hour INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scan_id UUID,
    name VARCHAR(255),
    report_type VARCHAR(50),
    format VARCHAR(20),
    file_path TEXT,
    file_size BIGINT,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50),
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    member_limit INTEGER DEFAULT 25,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'active',
    permissions JSONB,
    invited_by UUID,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invitee_email VARCHAR(255) NOT NULL,
    invitee_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'pending',
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    accepted_at TIMESTAMP
);

-- Scans
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target TEXT,
    scan_type VARCHAR(20) DEFAULT 'file',
    url TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_hash TEXT,
    status VARCHAR(20) DEFAULT 'queued',
    threat_level VARCHAR(20),
    confidence_score FLOAT,
    ml_model_used TEXT,
    scan_duration INTEGER,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    engine VARCHAR(100),
    detection_name TEXT,
    threat_type VARCHAR(50),
    severity VARCHAR(20),
    details TEXT,
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID,
    amount NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP,
    amount NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE,
    transaction_id VARCHAR(100),
    billing_id UUID,
    amount NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'paid',
    tier VARCHAR(20),
    billing_cycle VARCHAR(20),
    invoice_date TIMESTAMP,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tier_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    old_tier VARCHAR(20),
    new_tier VARCHAR(20),
    reason TEXT,
    changed_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team usage
CREATE TABLE IF NOT EXISTS team_usage (
    team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    scans_total INTEGER DEFAULT 0,
    scans_this_month INTEGER DEFAULT 0,
    api_calls_total INTEGER DEFAULT 0,
    api_calls_this_month INTEGER DEFAULT 0,
    storage_total BIGINT DEFAULT 0,
    reports_generated INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_member_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    scans_count INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    last_scan_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_member_usage_team_user
    ON team_member_usage(team_id, user_id);

CREATE TABLE IF NOT EXISTS user_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    usage_type VARCHAR(20) NOT NULL,
    amount INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for API key actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    changes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_email ON team_invitations(invitee_email);

-- Ensure columns exist for older databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_team_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS scans_limit INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS scans_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_calls_limit INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_calls_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 1073741824;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reports_generated INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS member_limit INTEGER DEFAULT 25;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS invited_by UUID;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Foreign key added after team table exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_current_team_fk'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_current_team_fk
            FOREIGN KEY (current_team_id) REFERENCES teams(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- Functions for usage tracking
CREATE OR REPLACE FUNCTION track_user_usage(
    p_user_id UUID,
    p_usage_type TEXT,
    p_amount INTEGER,
    p_metadata JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_usage_history (id, user_id, usage_type, amount, metadata, created_at)
    VALUES (uuid_generate_v4(), p_user_id, p_usage_type, p_amount, p_metadata, NOW());

    IF p_usage_type = 'scan' THEN
        UPDATE users SET scans_used = scans_used + p_amount WHERE id = p_user_id;
    ELSIF p_usage_type = 'api_call' THEN
        UPDATE users SET api_calls_used = api_calls_used + p_amount WHERE id = p_user_id;
    ELSIF p_usage_type = 'report' THEN
        UPDATE users SET reports_generated = reports_generated + p_amount WHERE id = p_user_id;
    ELSIF p_usage_type = 'storage' THEN
        UPDATE users SET storage_used = storage_used + p_amount WHERE id = p_user_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_team_member_usage(
    p_team_id UUID,
    p_user_id UUID,
    p_usage_type TEXT,
    p_amount INTEGER
) RETURNS VOID AS $$
DECLARE
    v_member_id UUID;
BEGIN
    SELECT id INTO v_member_id
    FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id
    LIMIT 1;

    INSERT INTO team_member_usage (id, team_id, user_id, member_id, scans_count, api_calls_count, reports_count, last_activity_at)
    VALUES (
        uuid_generate_v4(),
        p_team_id,
        p_user_id,
        v_member_id,
        CASE WHEN p_usage_type = 'scan' THEN p_amount ELSE 0 END,
        CASE WHEN p_usage_type = 'api_call' THEN p_amount ELSE 0 END,
        CASE WHEN p_usage_type = 'report' THEN p_amount ELSE 0 END,
        NOW()
    )
    ON CONFLICT (team_id, user_id) DO UPDATE SET
        member_id = EXCLUDED.member_id,
        scans_count = team_member_usage.scans_count + CASE WHEN p_usage_type = 'scan' THEN p_amount ELSE 0 END,
        api_calls_count = team_member_usage.api_calls_count + CASE WHEN p_usage_type = 'api_call' THEN p_amount ELSE 0 END,
        reports_count = team_member_usage.reports_count + CASE WHEN p_usage_type = 'report' THEN p_amount ELSE 0 END,
        last_activity_at = NOW();

    INSERT INTO team_usage (team_id, scans_total, scans_this_month, api_calls_total, api_calls_this_month, reports_generated, active_members, last_activity_at, updated_at)
    VALUES (
        p_team_id,
        CASE WHEN p_usage_type = 'scan' THEN p_amount ELSE 0 END,
        CASE WHEN p_usage_type = 'scan' THEN p_amount ELSE 0 END,
        CASE WHEN p_usage_type = 'api_call' THEN p_amount ELSE 0 END,
        CASE WHEN p_usage_type = 'api_call' THEN p_amount ELSE 0 END,
        CASE WHEN p_usage_type = 'report' THEN p_amount ELSE 0 END,
        (SELECT COUNT(*) FROM team_members WHERE team_id = p_team_id),
        NOW(),
        NOW()
    )
    ON CONFLICT (team_id) DO UPDATE SET
        scans_total = team_usage.scans_total + CASE WHEN p_usage_type = 'scan' THEN p_amount ELSE 0 END,
        scans_this_month = team_usage.scans_this_month + CASE WHEN p_usage_type = 'scan' THEN p_amount ELSE 0 END,
        api_calls_total = team_usage.api_calls_total + CASE WHEN p_usage_type = 'api_call' THEN p_amount ELSE 0 END,
        api_calls_this_month = team_usage.api_calls_this_month + CASE WHEN p_usage_type = 'api_call' THEN p_amount ELSE 0 END,
        reports_generated = team_usage.reports_generated + CASE WHEN p_usage_type = 'report' THEN p_amount ELSE 0 END,
        active_members = (SELECT COUNT(*) FROM team_members WHERE team_id = p_team_id),
        last_activity_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_monthly_usage() RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET scans_used = 0,
        api_calls_used = 0,
        reports_generated = 0,
        usage_reset_at = NOW();

    UPDATE team_usage
    SET scans_this_month = 0,
        api_calls_this_month = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Seed users for local/test login
INSERT INTO users (email, password_hash, full_name, tier)
VALUES
    ('demo.free@example.com', '$2a$10$MKWJePeeYvhbIK5Ae6H.XOfIqNXoJN3Z0/J49/DcK4LOtonhvZzze', 'Demo Free', 'free'),
    ('demo.premium@example.com', '$2a$10$MKWJePeeYvhbIK5Ae6H.XOfIqNXoJN3Z0/J49/DcK4LOtonhvZzze', 'Demo Premium', 'premium'),
    ('demo.business@example.com', '$2a$10$MKWJePeeYvhbIK5Ae6H.XOfIqNXoJN3Z0/J49/DcK4LOtonhvZzze', 'Demo Business', 'business')
ON CONFLICT (email) DO NOTHING;
