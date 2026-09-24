-- Poker Rake Ledger: PostgreSQL Schema for Supabase
-- Uses integer PAISE (amount_paise BIGINT) for strict monetary correctness (1 INR = 100 Paise)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. OWNERS TABLE
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. GAMES TABLE
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    from_bucket TEXT NOT NULL CHECK (from_bucket IN ('table_recovery', 'festival_fund')),
    to_bucket TEXT NOT NULL CHECK (to_bucket IN ('table_recovery', 'festival_fund', 'owner_profit')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. GAME_OWNERS (Attendance per game)
CREATE TABLE IF NOT EXISTS game_owners (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (game_id, owner_id)
);

-- 5. RAKE_ENTRIES (Both game-associated and historical rake)
CREATE TABLE IF NOT EXISTS rake_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    entry_type TEXT NOT NULL DEFAULT 'historical' CHECK (entry_type IN ('game', 'historical')),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. EXPENSES TABLE (Session expenses, monthly expenses, credit adjustments)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    expense_type TEXT NOT NULL CHECK (expense_type IN ('session_expense', 'monthly_expense', 'credit_adjustment')),
    description TEXT NOT NULL,
    expense_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. OWNER_SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS owner_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    settled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. AUDIT_LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Require authenticated access for all tables
-- ==========================================

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE rake_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write for the shared ledger
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('owners', 'players', 'games', 'game_owners', 'rake_entries', 'payments', 'expenses', 'owner_settlements', 'settings', 'audit_log')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users full access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Allow authenticated users full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ==========================================
-- SEED DATA
-- Default settings, 4 owners, 16 historical players & rake
-- ==========================================

-- Insert Settings
INSERT INTO settings (key, value) VALUES
('table_recovery_target', '{"amount_paise": 6500000}'::jsonb),
('festival_fund_target', '{"amount_paise": 3000000}'::jsonb),
('equal_distribution_threshold', '{"amount_paise": 100000}'::jsonb),
('absent_owner_percentage', '{"percentage": 0.10}'::jsonb),
('number_of_owners', '{"count": 4}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert 4 Default Owners (IDs can be customized)
INSERT INTO owners (id, name, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Owner 1', true),
('00000000-0000-0000-0000-000000000002', 'Owner 2', true),
('00000000-0000-0000-0000-000000000003', 'Owner 3', true),
('00000000-0000-0000-0000-000000000004', 'Owner 4', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Known Players and Seed Historical Rake (Section 18 & 38)
DO $$
DECLARE
    p_id UUID;
BEGIN
    -- Temporary helper function/inserts
    -- 1. Anmol ₹12,200
    INSERT INTO players (name) VALUES ('Anmol') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 1220000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 2. Om ₹5,450
    INSERT INTO players (name) VALUES ('Om') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 545000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 3. Rohra ₹1,000
    INSERT INTO players (name) VALUES ('Rohra') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 100000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 4. Kateja ₹5,700
    INSERT INTO players (name) VALUES ('Kateja') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 570000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 5. Brahma ₹2,400
    INSERT INTO players (name) VALUES ('Brahma') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 240000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 6. Yuvi ₹2,000
    INSERT INTO players (name) VALUES ('Yuvi') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 200000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 7. Mayur ₹1,200
    INSERT INTO players (name) VALUES ('Mayur') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 120000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 8. Bhatia ₹2,400
    INSERT INTO players (name) VALUES ('Bhatia') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 240000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 9. Sagar C ₹2,000
    INSERT INTO players (name) VALUES ('Sagar C') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 200000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 10. Sachin ₹1,500
    INSERT INTO players (name) VALUES ('Sachin') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 150000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 11. Chellani ₹3,000
    INSERT INTO players (name) VALUES ('Chellani') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 300000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 12. SB ₹4,600
    INSERT INTO players (name) VALUES ('SB') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 460000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 13. Paras ₹4,200
    INSERT INTO players (name) VALUES ('Paras') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 420000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 14. Pratish ₹700
    INSERT INTO players (name) VALUES ('Pratish') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 70000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 15. Piyush ₹3,700
    INSERT INTO players (name) VALUES ('Piyush') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 370000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;

    -- 16. Tanna ₹600
    INSERT INTO players (name) VALUES ('Tanna') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;
    INSERT INTO rake_entries (player_id, amount_paise, entry_type, notes) VALUES (p_id, 60000, 'historical', 'Historical rake seed') ON CONFLICT DO NOTHING;
END $$;

-- Enable RLS on bucket_transfers
ALTER TABLE bucket_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read bucket_transfers" ON bucket_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert bucket_transfers" ON bucket_transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update bucket_transfers" ON bucket_transfers FOR UPDATE TO authenticated USING (true);

-- =========================================================================
-- SCRIPT TO WIPE DATABASE (If you wish to clear all entries to start fresh)
-- =========================================================================
-- TRUNCATE TABLE payments, rake_entries, expenses, owner_settlements, game_owners, games, bucket_transfers, players CASCADE;
-- INSERT INTO audit_log (action, entity_type, metadata) VALUES ('DATABASE_CLEARED', 'ledger', '{"reason": "Manual database wipe"}'::jsonb);

