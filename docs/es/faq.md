# Preguntas Frecuentes

## General

### ¿Qué es SOLFINDER?
SOLFINDER es un bot de Telegram para inteligencia blockchain en Solana. Detecta wallets frescas fondeadas desde exchanges y rastrea fondos a través de Privacy Cash, el protocolo de mixing de Solana.

### ¿SOLFINDER es gratis?
Contactanos para información sobre acceso y planes de precios.

### ¿Necesito conectar mi wallet?
No. SOLFINDER es de solo lectura. Analiza datos on-chain públicamente disponibles. Nunca necesitás conectar una wallet, compartir claves privadas ni firmar ninguna transacción.

### ¿Qué blockchain soporta?
Actualmente, **solo Solana**. El soporte para otras cadenas podría agregarse en el futuro.

### ¿A qué datos accede SOLFINDER?
Solo datos públicos de la blockchain — historiales de transacciones, cambios de balance e interacciones con programas. Son los mismos datos visibles en cualquier explorador de bloques como Solscan.

---

## Fresh Wallet Scanner

### ¿Qué cuenta como "wallet fresca"?
Una wallet que **solo recibió** SOL y **nunca envió** ninguna transacción. Esto típicamente indica una wallet nueva que todavía no fue usada.

### ¿Qué significa "hopping"?
Cuando los fondos se mueven a través de wallets intermedias antes de llegar al destino final. Por ejemplo: Exchange → Wallet A → Wallet B → Wallet C. El modo hopping sigue estas cadenas hasta 3 pasos de profundidad.

### ¿Cuántos exchanges soporta?
15+ exchanges incluyendo Binance, OKX, Bybit, Kucoin, MEXC, Coinbase y más.

### ¿Puedo monitorear varios exchanges a la vez?
Sí. Podés seleccionar cualquier combinación de exchanges antes de correr un escaneo.

---

## Privacy Cash Scanner

### ¿Cómo rastrea SOLFINDER las transacciones de Privacy Cash?
Analizando los **montos y tiempos** de depósitos y retiros de la pool de Privacy Cash. Cuando alguien deposita un monto específico, la misma cantidad (menos comisiones) aparece como uno o más retiros poco después. El bot matchea estos usando análisis inteligente de montos.

### ¿Esto rompe la encriptación de Privacy Cash?
No. SOLFINDER no rompe ninguna criptografía. Usa **datos de transacciones públicos** — los montos, timestamps y direcciones de wallet que son visibles para todos en la blockchain. El matcheo se basa en correlacionar esta información pública.

### ¿Qué es un resultado "bridgeado"?
Cuando el bot encuentra un depósito pero no puede matchearlo con ningún retiro en Solana, significa que los fondos probablemente salieron de la red Solana a través de un bridge cross-chain (a Ethereum, BNB Chain, etc.). La detección de bridges está planeada para una actualización futura.

### ¿Por qué la Función 2 no encontró un emisor?
Posibles razones:
- El depósito ocurrió más de 5 minutos antes/después del retiro.
- Los fondos fueron bridgeados desde otra blockchain a Privacy Cash.
- El depósito se dividió en muchos retiros pequeños que son difíciles de matchear.

### ¿Qué significa "otros destinatarios" en la Función 2?
Cuando alguien deposita 15 SOL y sale como 7 SOL a Wallet X y 8 SOL a Wallet Y, ambas wallets son destinatarias del mismo depósito. Si consultaste por Wallet X, el bot también muestra Wallet Y como "otro destinatario".

### ¿Por qué todos los horarios tienen que estar en UTC?
Las transacciones blockchain se registran en UTC. Para mantener todo consistente y evitar confusiones, el bot usa UTC para todas las entradas y salidas. La hora UTC actual se muestra cuando ingresás un rango horario.

### ¿Cuál es el rango máximo para la Función 3?
2 horas. Esto mantiene el escaneo rápido y dentro de los límites de la API. Para períodos más largos, corré múltiples escaneos con ventanas de tiempo diferentes.

---

## Solución de Problemas

### El bot dice "Invalid time range" pero mi input se ve correcto
Esto generalmente significa que la hora de fin está en el **futuro** (en UTC). Recordá: si estás en UTC-3 y son las 21:00 local, ya son las 00:00 UTC del día siguiente. Elegí "Yesterday" para consultar horas anteriores.

### El bot está lento o no responde
Los escaneos grandes (especialmente Función 3 con rango de 2 horas) pueden tardar 30-60 segundos. El bot mostrará un indicador de progreso. Si no responde después de 2 minutos, enviá `/cancel` e intentá de nuevo.

### Me dio un error que dice que la transacción no es de Privacy Cash
Asegurate de estar pegando una transacción que realmente interactuó con Privacy Cash. Podés verificar en [Solscan](https://solscan.io) — buscá "Privacy Cash: Transact" en los detalles de la transacción.

---

## Seguridad y Privacidad

### ¿SOLFINDER guarda mis datos?
El bot procesa tus solicitudes en tiempo real. No almacena tus consultas, direcciones de wallet ni firmas de transacciones de forma permanente.

### ¿Alguien puede ver lo que busco?
No. Tus interacciones con el bot son mensajes privados de Telegram. Otros usuarios no pueden ver tus consultas ni resultados.

### ¿Es seguro usar SOLFINDER?
Sí. El bot es de solo lectura — no puede mover fondos, acceder a wallets ni interactuar con ningún protocolo en tu nombre. Solo lee datos públicos de la blockchain.
