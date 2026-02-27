import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.argv[2]; // Get webhook URL from command line

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ Error: Please provide webhook URL as argument');
  console.error('Usage: node scripts/set-webhook.js https://your-app.vercel.app/api/webhook');
  process.exit(1);
}

async function setWebhook() {
  try {
    console.log('🔧 Setting Telegram webhook...');
    console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          allowed_updates: ['message', 'callback_query']
        })
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log(`📊 Response:`, data.result);
    } else {
      console.error('❌ Failed to set webhook:');
      console.error(data);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
  }
}

async function getWebhookInfo() {
  try {
    console.log('\n🔍 Getting current webhook info...');

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );

    const data = await response.json();

    if (data.ok) {
      console.log('📊 Current webhook info:');
      console.log(JSON.stringify(data.result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error getting webhook info:', error.message);
  }
}

// Run
(async () => {
  await setWebhook();
  await getWebhookInfo();
})();
