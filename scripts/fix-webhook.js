import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://defilo.vercel.app/api/webhook';

async function fixWebhook() {
  console.log('🔧 ARREGLANDO WEBHOOK - Paso a Paso\n');

  // Paso 1: Eliminar webhook
  console.log('1️⃣  Eliminando webhook existente...');
  try {
    const delResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`
    );
    const delData = await delResponse.json();
    console.log(delData.ok ? '✅ Eliminado' : '❌ Error:', delData);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Paso 2: Esperar 5 segundos
  console.log('\n2️⃣  Esperando 5 segundos...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('✅ Listo');

  // Paso 3: Configurar nuevo webhook
  console.log(`\n3️⃣  Configurando webhook a: ${WEBHOOK_URL}`);
  try {
    const setResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
          max_connections: 40
        })
      }
    );
    const setData = await setResponse.json();

    if (setData.ok) {
      console.log('✅ Configurado exitosamente');
      console.log('Respuesta:', setData);
    } else {
      console.log('❌ Error configurando:', setData);
      return;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  // Paso 4: Esperar otros 5 segundos
  console.log('\n4️⃣  Esperando 5 segundos para que Telegram aplique cambios...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('✅ Listo');

  // Paso 5: Verificar
  console.log('\n5️⃣  Verificando configuración...');
  try {
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    const infoData = await infoResponse.json();

    if (infoData.ok) {
      const info = infoData.result;
      console.log('\n📊 ESTADO DEL WEBHOOK:');
      console.log('─'.repeat(60));
      console.log(`URL:           ${info.url || '❌ No configurado'}`);
      console.log(`IP:            ${info.ip_address || 'N/A'}`);
      console.log(`Pending:       ${info.pending_update_count}`);
      console.log(`Max Conn:      ${info.max_connections}`);
      console.log('─'.repeat(60));

      if (info.url === WEBHOOK_URL) {
        console.log('\n✅ ¡WEBHOOK CONFIGURADO CORRECTAMENTE!\n');
        console.log('Ahora prueba en Telegram:');
        console.log('1. Envía /start al bot');
        console.log('2. Espera 1-2 minutos');
        console.log('3. Ve a Vercel → Logs');
        console.log('4. Deberías ver logs con 📥 Webhook received\n');
      } else {
        console.log('\n❌ WEBHOOK NO CONFIGURADO\n');
        console.log('Posibles causas:');
        console.log('- El URL de Vercel no es accesible');
        console.log('- Telegram está rechazando la URL');
        console.log('- Hay un problema con el certificado SSL\n');
      }

      if (info.last_error_message) {
        console.log('\n⚠️  ÚLTIMO ERROR:');
        console.log(`   Mensaje: ${info.last_error_message}`);
        console.log(`   Fecha: ${new Date(info.last_error_date * 1000).toLocaleString()}\n`);
      }
    }
  } catch (error) {
    console.log('❌ Error verificando:', error.message);
  }
}

fixWebhook();
