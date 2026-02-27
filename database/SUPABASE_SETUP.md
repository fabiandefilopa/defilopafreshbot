# Supabase Setup Guide

This guide will help you set up Supabase for the Solana Wallet Bot.

## Prerequisites

- A Supabase account (free tier available)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the following:
   - **Name**: `solana-wallet-bot` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Choose the closest region to your server/location
   - **Pricing Plan**: Free tier is sufficient for testing
5. Click "Create new project"
6. Wait for the project to finish setting up (usually 1-2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click on the ⚙️ **Settings** icon (bottom left)
2. Navigate to **API** section
3. You'll see two important values:
   - **Project URL**: Copy this (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **Project API keys**: Copy the `anon` / `public` key (not the `service_role` key)

## Step 3: Configure Your .env File

1. Open your `.env` file in the project root
2. Replace the placeholder values with your actual credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** Never commit your `.env` file to git! It's already in `.gitignore`.

## Step 4: Create Database Tables

1. In your Supabase project dashboard, click on the **SQL Editor** icon (left sidebar)
2. Click "New Query"
3. Open the `database/schema.sql` file from this project
4. Copy all the SQL code from `schema.sql`
5. Paste it into the Supabase SQL Editor
6. Click "Run" (or press Ctrl/Cmd + Enter)
7. You should see a success message: "Success. No rows returned"

## Step 5: Verify Tables Were Created

1. Click on the **Table Editor** icon (left sidebar)
2. You should see two tables:
   - `users` - Stores Telegram bot users
   - `scan_history` - Stores wallet scan results (for future use)

## Step 6: Test the Connection

1. Make sure your bot is running with the updated `.env` file
2. Start the bot: `npm start`
3. Look for this message in the console:
   ```
   ✅ Supabase client initialized successfully
   ```

If you see a warning instead:
```
⚠️  Supabase credentials not found in .env file
```
Double-check that you've updated the `.env` file correctly.

## Database Schema Overview

### Users Table
Stores basic information about each Telegram user:
- `id` - Unique UUID
- `chat_id` - Telegram chat ID (unique)
- `username` - Telegram username
- `first_name` - User's first name
- `last_name` - User's last name
- `created_at` - When user first used the bot
- `last_activity` - Last time user interacted with bot

### Scan History Table (Future Use)
Will store each scan performed by users:
- `id` - Unique UUID
- `chat_id` - Reference to user
- `exchanges` - Which exchanges were scanned
- `scan_type` - Simple or hopping mode
- `filter_config` - Filter settings used
- `time_range` - Time range in hours
- `results_count` - Number of fresh wallets found
- `fresh_wallets` - Array of wallet results
- `scan_duration` - How long the scan took
- `created_at` - When scan was performed

## Security Notes

1. **Never share your `SUPABASE_ANON_KEY`** publicly
2. **Never commit your `.env` file** to version control
3. **Row Level Security (RLS)** is enabled on all tables
4. The bot uses the anon key, which has limited permissions
5. For production, consider using the service role key with proper security

## Troubleshooting

### Connection Failed
- Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check if your Supabase project is active
- Make sure you're using the `anon` key, not the `service_role` key

### Tables Not Created
- Run the SQL schema again in the SQL Editor
- Check for error messages in the SQL Editor
- Make sure you copied the entire `schema.sql` file

### Bot Not Tracking Users
- This feature is not yet implemented in the bot logic
- The infrastructure is ready, but user tracking will be added in a future update

## Next Steps

The database infrastructure is now ready. Future updates will include:
- Automatic user registration when they start the bot
- Saving scan history for each user
- User statistics and analytics
- Scan history viewing command

For now, the database is set up and ready, but the bot logic hasn't been integrated yet (as requested for testing purposes).
