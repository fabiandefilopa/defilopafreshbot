import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function diagnostico() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL BOT\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Verificar token
  console.log('1️⃣  TOKEN:');
  if (!BOT_TOKEN) {
    console.log('❌ Token NO encontrado en .env');
    return;
  }
  console.log(`✅ Token encontrado (${BOT_TOKEN.length} caracteres)`);
  console.log(`   Inicia con: ${BOT_TOKEN.substring(0, 15)}...`);
  console.log();

  // 2. Test API de Telegram
  console.log('2️⃣  TEST API DE TELEGRAM:');
  try {
    const testResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const testData = await testResponse.json();

    if (testData.ok) {
      console.log(`✅ API funciona correctamente`);
      console.log(`   Bot: @${testData.result.username}`);
      console.log(`   ID: ${testData.result.id}`);
    } else {
      console.log(`❌ API error:`, testData);
    }
  } catch (error) {
    console.log(`❌ Error conectando a Telegram:`, error.message);
  }
  console.log();

  // 3. Webhook actual
  console.log('3️⃣  WEBHOOK ACTUAL:');
  try {
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookData = await webhookResponse.json();

    if (webhookData.ok) {
      const info = webhookData.result;
      console.log(`   URL: ${info.url || '❌ No configurado'}`);
      console.log(`   Pending updates: ${info.pending_update_count}`);
      if (info.last_error_message) {
        console.log(`   ⚠️  Último error: ${info.last_error_message}`);
        console.log(`   Fecha: ${new Date(info.last_error_date * 1000).toLocaleString()}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error obteniendo webhook:`, error.message);
  }
  console.log();

  // 4. Intentar configurar webhook
  console.log('4️⃣  CONFIGURANDO WEBHOOK A VERCEL:');
  try {
    const setResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://defilo.vercel.app/api/webhook',
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true // Limpiar updates pendientes
        })
      }
    );

    const setData = await setResponse.json();

    if (setData.ok) {
      console.log(`✅ Webhook configurado exitosamente`);
    } else {
      console.log(`❌ Error configurando webhook:`, setData);
    }
  } catch (error) {
    console.log(`❌ Error configurando webhook:`, error.message);
  }
  console.log();

  // 5. Verificar después de configurar
  console.log('5️⃣  VERIFICACIÓN FINAL:');
  // Esperar 2 segundos
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const finalResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const finalData = await finalResponse.json();

    if (finalData.ok) {
      const info = finalData.result;
      if (info.url === 'https://defilo.vercel.app/api/webhook') {
        console.log(`✅ WEBHOOK CONFIGURADO CORRECTAMENTE`);
        console.log(`   URL: ${info.url}`);
        console.log(`   IP: ${info.ip_address || 'N/A'}`);
      } else {
        console.log(`❌ Webhook NO configurado`);
        console.log(`   URL actual: ${info.url || 'Ninguna'}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error verificando:`, error.message);
  }

  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n✅ DIAGNÓSTICO COMPLETO\n');
  console.log('Ahora prueba el bot en Telegram:');
  console.log('1. Abre Telegram');
  console.log('2. Busca tu bot');
  console.log('3. Envía /start');
  console.log('4. Espera 2 minutos');
  console.log('5. Ve a Vercel Dashboard → Logs');
  console.log('\n');
}

diagnostico();
