-- ============================================
-- Supabase Database Schema for Solana Wallet Bot
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Stores Telegram bot users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for faster lookups
  CONSTRAINT users_chat_id_key UNIQUE (chat_id)
);

-- Create index on chat_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);

-- ============================================
-- SCAN HISTORY TABLE
-- Stores wallet scan history for each user
-- ============================================
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id TEXT NOT NULL,

  -- Scan configuration
  exchanges JSONB NOT NULL,              -- Array of exchange names
  scan_type TEXT NOT NULL,               -- 'simple' or 'hopping'
  filter_type TEXT NOT NULL,             -- 'range' or 'target'
  filter_config JSONB NOT NULL,          -- Filter configuration object
  time_range NUMERIC NOT NULL,           -- Time range in hours

  -- Scan results
  results_count INTEGER DEFAULT 0,       -- Total fresh wallets found
  fresh_wallets JSONB,                   -- Array of fresh wallet results
  scan_duration NUMERIC,                 -- Duration in seconds

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key to users table
  CONSTRAINT fk_scan_history_user
    FOREIGN KEY (chat_id)
    REFERENCES users(chat_id)
    ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_scan_history_chat_id ON scan_history(chat_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_scan_type ON scan_history(scan_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for security
-- ============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on scan_history table
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  USING (true);  -- Backend service has full access with service role key

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  WITH CHECK (true);  -- Backend service has full access

-- Policy: Users can update their own data
CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  USING (true);

-- Policy: Scan history can be viewed
CREATE POLICY "Scan history can be viewed"
  ON scan_history
  FOR SELECT
  USING (true);

-- Policy: Scan history can be inserted
CREATE POLICY "Scan history can be inserted"
  ON scan_history
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update last_activity timestamp
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_activity on users table
CREATE TRIGGER trigger_update_last_activity
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- ============================================
-- SAMPLE QUERIES (for testing)
-- ============================================

-- Get all users
-- SELECT * FROM users ORDER BY created_at DESC;

-- Get user scan history
-- SELECT * FROM scan_history WHERE chat_id = 'YOUR_CHAT_ID' ORDER BY created_at DESC;

-- Get scan statistics
-- SELECT
--   scan_type,
--   COUNT(*) as total_scans,
--   AVG(results_count) as avg_results,
--   AVG(scan_duration) as avg_duration
-- FROM scan_history
-- GROUP BY scan_type;

-- Get most active users
-- SELECT
--   chat_id,
--   username,
--   COUNT(sh.id) as total_scans
-- FROM users u
-- LEFT JOIN scan_history sh ON u.chat_id = sh.chat_id
-- GROUP BY u.chat_id, u.username
-- ORDER BY total_scans DESC
-- LIMIT 10;
