-- =========================================================================
-- Poker Rake Ledger: Clean PostgreSQL Schema for Supabase
-- Uses integer PAISE (amount_paise BIGINT) for strict monetary correctness (1 INR = 100 Paise)
-- Compatible with free Supabase projects
-- =========================================================================

-- Enable pgcrypto / uuid-ossp for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. OWNERS TABLE (Fixed 4 Table Partners)
CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. GAMES TABLE
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_number INTEGER NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    gross_rake_paise BIGINT NOT NULL CHECK (gross_rake_paise >= 0),
    custom_allocation JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    notes TEXT,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. BUCKET_TRANSFERS TABLE (Custom Fund Reallocations between Buckets)
CREATE TABLE IF NOT EXISTS bucket_transfers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    from_bucket TEXT NOT NULL CHECK (from_bucket IN ('table_recovery', 'festival_fund')),
    to_bucket TEXT NOT NULL CHECK (to_bucket IN ('table_recovery', 'festival_fund', 'owner_profit')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. GAME_OWNERS (Attendance per game: exactly 4 partners)
CREATE TABLE IF NOT EXISTS game_owners (
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (game_id, owner_id)
);

-- 6. RAKE_ENTRIES (Both game-associated and historical rake)
CREATE TABLE IF NOT EXISTS rake_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    entry_type TEXT NOT NULL DEFAULT 'historical' CHECK (entry_type IN ('game', 'historical')),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    received_by_owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. EXPENSES TABLE (Session expenses, monthly expenses, credit adjustments)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    expense_type TEXT NOT NULL CHECK (expense_type IN ('session_expense', 'monthly_expense', 'credit_adjustment')),
    description TEXT NOT NULL,
    expense_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    paid_by_owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. OWNER_SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS owner_settlements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    settled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    paid_by_owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Safe idempotent migrations for existing databases:
ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_by_owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by_owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL;
ALTER TABLE owner_settlements ADD COLUMN IF NOT EXISTS paid_by_owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL;

-- 10. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. AUDIT_LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows both anon (frontend app) and authenticated users access
-- ==========================================

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE rake_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('owners', 'players', 'games', 'game_owners', 'rake_entries', 'payments', 'expenses', 'owner_settlements', 'bucket_transfers', 'settings', 'audit_log')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow shared ledger access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Allow shared ledger access" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- Enable Realtime for live updates across open browser tabs/devices
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE owners, players, games, game_owners, rake_entries, payments, expenses, owner_settlements, bucket_transfers, settings;
EXCEPTION WHEN OTHERS THEN
    -- Table may already be in publication, ignore error
    NULL;
END $$;

-- ==========================================
-- INITIAL CONFIGURATION & 4 OWNERS
-- (Starts clean with 0 players and 0 games)
-- ==========================================

INSERT INTO settings (key, value) VALUES
('table_recovery_target', '{"amount_paise": 6500000}'::jsonb),
('festival_fund_target', '{"amount_paise": 3000000}'::jsonb),
('equal_distribution_threshold', '{"amount_paise": 100000}'::jsonb),
('absent_owner_percentage', '{"percentage": 0.10}'::jsonb),
('number_of_owners', '{"count": 4}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO owners (id, name, is_active) VALUES
('owner-1', 'Owner 1', true),
('owner-2', 'Owner 2', true),
('owner-3', 'Owner 3', true),
('owner-4', 'Owner 4', true)
ON CONFLICT (id) DO NOTHING;

-- SCRIPT TO WIPE ALL LEDGER ENTRIES IF NEEDED:
-- TRUNCATE TABLE payments, rake_entries, expenses, owner_settlements, game_owners, games, bucket_transfers, players CASCADE;
