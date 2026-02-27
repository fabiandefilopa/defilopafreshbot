# 🔒 Security Guidelines

This document outlines security best practices for the Solana Wallet Bot project.

## ⚠️ Critical: Never Commit These Files!

### 🚨 **HIGH RISK - Credentials & API Keys**

These files contain sensitive credentials and **MUST NEVER** be committed to version control:

1. **`.env`** - Contains all your API keys and credentials
   - ✅ Already in `.gitignore`
   - Contains: Bot token, RPC URLs, Supabase keys
   - **NEVER** share this file publicly
   - **NEVER** commit to Git

2. **`.env.local`** - Local environment overrides
   - ✅ Already in `.gitignore`
   - Same sensitivity as `.env`

3. **`.env.production`** - Production environment variables
   - ✅ Already in `.gitignore`
   - Contains production credentials

### 📋 What's Protected by .gitignore

Our `.gitignore` file protects:

```
✅ .env (all variants)          # API keys, tokens, credentials
✅ node_modules/                # Dependencies (can be reinstalled)
✅ .vercel/                     # Vercel deployment config
✅ logs/                        # May contain sensitive data
✅ .vscode/, .idea/            # IDE settings (may contain paths)
✅ temp/, tmp/                 # Temporary files
```

## 🔐 Sensitive Information in This Project

### 1. Telegram Bot Token
- **Location**: `.env` → `TELEGRAM_BOT_TOKEN`
- **Risk Level**: 🔴 CRITICAL
- **If Exposed**: Anyone can control your bot and impersonate it
- **What to Do**:
  1. Immediately revoke the token in @BotFather
  2. Generate a new token
  3. Update `.env` file
  4. Redeploy to Vercel

### 2. Solana RPC URL with API Key
- **Location**: `.env` → `SOLANA_RPC_URL`
- **Risk Level**: 🟠 HIGH
- **If Exposed**: Others can use your RPC quota, potentially costing money
- **What to Do**:
  1. Regenerate API key in Helius/RPC provider dashboard
  2. Update `.env` file
  3. Redeploy to Vercel

### 3. Supabase Credentials
- **Location**: `.env` → `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- **Risk Level**: 🟡 MEDIUM (with RLS policies enabled)
- **If Exposed**: Database access may be compromised
- **Note**: The anon key is "public" but should still be protected
- **What to Do**:
  1. Regenerate keys in Supabase dashboard
  2. Verify RLS policies are enabled
  3. Update `.env` file
  4. Redeploy to Vercel

## ✅ Before Committing to Git

### Pre-Commit Checklist

Run these checks BEFORE `git add` or `git commit`:

```bash
# 1. Check what files will be added
git status

# 2. Verify .env is NOT in the list
# If you see .env, STOP and fix .gitignore

# 3. Check .gitignore is working
git check-ignore .env
# Should output: .env

# 4. View exactly what will be committed
git diff --cached
```

### Common Mistakes to Avoid

❌ **DON'T:**
- Commit `.env` file
- Hardcode credentials in source code
- Share screenshots with credentials visible
- Copy-paste error messages with API keys
- Push Vercel `.vercel` directory

✅ **DO:**
- Use `.env` for all credentials
- Use `.env.example` as a template (without real values)
- Keep `.gitignore` up to date
- Regularly check `git status` before committing

## 🛡️ Security Best Practices

### 1. Environment Variables
```javascript
// ❌ WRONG - Hardcoded
const BOT_TOKEN = "7123456789:AAHxxxxxxx";

// ✅ CORRECT - From environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
```

### 2. Never Log Sensitive Data
```javascript
// ❌ WRONG - Logs full token
console.log(`Token: ${process.env.TELEGRAM_BOT_TOKEN}`);

// ✅ CORRECT - Logs masked version
console.log(`Token: ${process.env.TELEGRAM_BOT_TOKEN.slice(0, 10)}...`);
```

### 3. Vercel Environment Variables
- Set environment variables in Vercel Dashboard, not in code
- Go to: Project Settings → Environment Variables
- Never commit `.vercel` directory

### 4. Git History
If you accidentally committed sensitive data:

```bash
# Remove file from Git history (CAREFUL!)
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from tracking"

# If already pushed, you need to rewrite history
# WARNING: This affects all collaborators
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (DANGER!)
git push origin --force --all
```

⚠️ **Better Solution**: Rotate all credentials immediately instead of rewriting history.

## 🔍 Verifying Security

### Check if .env is Tracked
```bash
# Should return nothing
git ls-files | grep .env

# If it returns .env, it's being tracked (BAD!)
```

### Test .gitignore
```bash
# Should output: .env
git check-ignore .env

# Should output: .vercel
git check-ignore .vercel
```

### Scan for Exposed Secrets (Optional)
Use tools like:
- [git-secrets](https://github.com/awslabs/git-secrets)
- [truffleHog](https://github.com/trufflesecurity/truffleHog)
- [gitleaks](https://github.com/gitleaks/gitleaks)

## 🚨 What to Do If Credentials Are Exposed

### Immediate Actions (within 5 minutes):

1. **Telegram Bot Token**
   - Open @BotFather in Telegram
   - Send `/mybots`
   - Select your bot
   - Click "API Token"
   - Click "Revoke current token"
   - Save new token to `.env`

2. **RPC API Key**
   - Login to Helius/RPC provider dashboard
   - Regenerate API key
   - Update `.env` file
   - Update Vercel environment variables

3. **Supabase Credentials**
   - Login to Supabase dashboard
   - Go to Settings → API
   - Reset service role key (if exposed)
   - Verify RLS policies are active

4. **Remove from Git History**
   ```bash
   # If already pushed to GitHub/GitLab
   git rm .env
   git commit -m "Remove exposed credentials"
   git push

   # Then rotate ALL credentials immediately
   ```

### After Securing:

1. Update all credentials in `.env`
2. Update environment variables in Vercel
3. Redeploy: `npm run deploy`
4. Test bot functionality
5. Review Git commit history for any other exposures

## 📚 Additional Resources

- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Vercel: Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [OWASP: API Security](https://owasp.org/www-project-api-security/)

## ✅ Security Checklist Summary

Before deploying or sharing your code:

- [ ] `.env` file is in `.gitignore`
- [ ] No credentials hardcoded in source files
- [ ] `.env.example` exists (without real values)
- [ ] Vercel environment variables are set
- [ ] `git status` shows no sensitive files
- [ ] All API keys are rotated if project was ever public
- [ ] Supabase RLS policies are enabled
- [ ] No sensitive data in commit messages
- [ ] No credentials in error logs

---

**🔒 Security is not optional. Protect your credentials like you protect your wallet!**
