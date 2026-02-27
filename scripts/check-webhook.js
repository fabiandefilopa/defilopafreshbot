import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

async function checkWebhook() {
  try {
    console.log('🔍 Checking current webhook status...\n');

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );

    const data = await response.json();

    if (data.ok) {
      const info = data.result;

      console.log('📊 Webhook Status:');
      console.log('─'.repeat(60));
      console.log(`URL:                  ${info.url || '❌ Not set'}`);
      console.log(`Has Custom Cert:      ${info.has_custom_certificate ? '✅' : '❌'}`);
      console.log(`Pending Updates:      ${info.pending_update_count || 0}`);
      console.log(`Max Connections:      ${info.max_connections || 40}`);
      console.log(`IP Address:           ${info.ip_address || 'N/A'}`);
      console.log(`Allowed Updates:      ${info.allowed_updates?.join(', ') || 'All'}`);

      if (info.last_error_date) {
        const errorDate = new Date(info.last_error_date * 1000).toLocaleString();
        console.log(`\n⚠️  Last Error:`);
        console.log(`   Date:    ${errorDate}`);
        console.log(`   Message: ${info.last_error_message || 'Unknown'}`);
      }

      console.log('─'.repeat(60));

      // Verification
      if (!info.url) {
        console.log('\n❌ Webhook not configured!');
        console.log('Run: npm run webhook');
      } else if (info.url === 'https://defilo.vercel.app/api/webhook') {
        console.log('\n✅ Webhook correctly configured for Vercel!');
      } else {
        console.log(`\n⚠️  Webhook configured but URL is different:`);
        console.log(`   Current: ${info.url}`);
        console.log(`   Expected: https://defilo.vercel.app/api/webhook`);
        console.log('\nTo fix, run: npm run webhook');
      }

      if (info.pending_update_count > 0) {
        console.log(`\n📬 You have ${info.pending_update_count} pending update(s)`);
      }

    } else {
      console.error('❌ Failed to get webhook info:');
      console.error(data);
    }
  } catch (error) {
    console.error('❌ Error checking webhook:', error.message);
  }
}

// Run
checkWebhook();
