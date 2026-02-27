# Quick Supabase Setup - 5 Minutes

## Step 1: Go to Supabase SQL Editor

1. Open [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** (icon on left sidebar, looks like `</>`)
4. Click **New Query**

## Step 2: Create Tables

Copy and paste the entire content from `database/INITIAL_SETUP.sql` into the SQL Editor and click **Run** (or press Ctrl+Enter).

You should see: ✅ **"Success. No rows returned"**

## Step 3: Verify Tables Were Created

Go to **Table Editor** (icon on left sidebar) and you should see:

- ✅ `users` table
- ✅ `scan_history` table

## What These Tables Do

### `users` table
Stores basic info about each Telegram user who uses the bot:
- `chat_id` - Telegram chat ID (unique identifier)
- `username` - Telegram username
- `first_name` - User's first name
- `last_name` - User's last name
- `created_at` - When they first used the bot
- `last_activity` - Last time they used the bot

### `scan_history` table (Optional - Not Used Yet)
Will store scan history in the future:
- Which exchanges were scanned
- What filters were used
- How many fresh wallets were found
- When the scan was performed

**Note:** The bot logic to save data isn't implemented yet. These tables are ready for future use.

## Credentials Already Configured

Your `.env` file already has:
```
SUPABASE_URL=https://ipntnxxniumgkppgvpkx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_K-UxgG-nnswRkBFZEbYL3g_tgL_RG8_
```

✅ You're all set! The database is ready for when you implement user tracking.

## Testing Connection (Optional)

Run your bot locally:
```bash
npm start
```

You should see:
```
✅ Supabase client initialized successfully
```

If you see a warning, double-check your `.env` file.

## Next Steps

The database infrastructure is ready. Future updates will include:
- Automatic user registration when they use `/start`
- Saving scan results to `scan_history` table
- Viewing past scan history
- User statistics

For now, focus on deploying the bot to Vercel (see `VERCEL_DEPLOYMENT.md`).
