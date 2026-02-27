-- ============================================
-- INITIAL SUPABASE SETUP
-- Quick setup script with only essential tables
-- ============================================

-- ============================================
-- STEP 1: Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 2: Create USERS table
-- Stores Telegram bot users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);

-- ============================================
-- STEP 3: Create SCAN_HISTORY table (Optional - for future use)
-- Stores wallet scan history for each user
-- ============================================
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id TEXT NOT NULL,
  exchanges JSONB NOT NULL,
  scan_type TEXT NOT NULL,
  filter_type TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  time_range NUMERIC NOT NULL,
  results_count INTEGER DEFAULT 0,
  fresh_wallets JSONB,
  scan_duration NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_scan_history_user
    FOREIGN KEY (chat_id)
    REFERENCES users(chat_id)
    ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_scan_history_chat_id ON scan_history(chat_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at DESC);

-- ============================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create RLS Policies (Allow all for backend)
-- ============================================
CREATE POLICY "Backend can do everything on users"
  ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend can do everything on scan_history"
  ON scan_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- Run these after creating tables to verify
-- ============================================

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check users table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';

-- Check scan_history table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scan_history';
