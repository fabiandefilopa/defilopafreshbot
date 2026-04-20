# Privacy Cash Scanner

## Qué Hace

El Privacy Cash Scanner rastrea fondos que pasan por **Privacy Cash**, un protocolo de mixing en Solana. Los mixers se usan para romper el vínculo on-chain entre un emisor y un receptor — SOLFINDER reconecta ese vínculo.

## ¿Qué es Privacy Cash?

Privacy Cash es un protocolo en Solana que funciona como una "pool de mezcla":

1. **Depósito**: Un usuario envía SOL desde la Wallet A a la pool de Privacy Cash.
2. **Retiro**: La misma cantidad sale de la pool hacia la Wallet B.
3. **Resultado**: On-chain, la Wallet A y la Wallet B aparecen completamente sin relación.

Esto se usa para privacidad legítima, pero también para ocultar el rastro de fondos. SOLFINDER puede vincular los depósitos y retiros entre sí.

## Cómo Funciona la Detección (Resumen)

El bot analiza el historial de transacciones de la pool de Privacy Cash y usa **coincidencia de montos** para conectar depósitos con sus retiros correspondientes:

- Cuando alguien deposita X SOL, la misma cantidad (menos una pequeña comisión del protocolo) se retira poco después — a veces dividida entre varias wallets.
- Al hacer coincidir los montos y tiempos de depósitos y retiros, el bot identifica qué wallets están conectadas.

> La detección se basa en datos on-chain públicamente disponibles. No se rompe ninguna criptografía ni se explota ningún protocolo.

## Las Tres Funciones

### Función 1 — Destinatarios de un Depósito

**"Sé quién envió fondos al mixer. ¿A dónde fue la plata?"**

- **Input**: La firma de una transacción de depósito (la tx donde alguien envió SOL a Privacy Cash).
- **Output**: La(s) wallet(s) que recibieron los fondos del otro lado.

**Cómo usar:**
1. Abrí Privacy Cash Scanner → Seleccioná **"Recipients of a deposit"**.
2. Pegá la firma de la transacción del depósito.
3. El bot analiza los retiros que ocurrieron dentro de los 5 minutos posteriores al depósito.
4. Encuentra la combinación de retiros cuyos montos coinciden con el depósito.
5. Obtenés la(s) dirección(es) de las wallets destinatarias y los montos que recibió cada una.

**Ejemplo:**
- Depósito: 23.68 SOL por Wallet A a las 19:20:00.
- Retiros encontrados: 20 SOL a Wallet B a las 19:20:15, y 3.68 SOL a Wallet C a las 19:20:26.
- Resultado: Los fondos de Wallet A fueron a **Wallet B** (20 SOL) y **Wallet C** (3.68 SOL).

### Función 2 — Emisor de un Retiro

**"Sé quién recibió fondos del mixer. ¿De dónde vino la plata?"**

- **Input**: La firma de una transacción de retiro (la tx donde una wallet recibió SOL de Privacy Cash).
- **Output**: La wallet que originalmente depositó los fondos.

**Cómo usar:**
1. Abrí Privacy Cash Scanner → Seleccioná **"Sender of a withdrawal"**.
2. Pegá la firma de la transacción del retiro.
3. El bot busca depósitos en una ventana de ±5 minutos alrededor del retiro.
4. Hace coincidir el monto del retiro (combinado con otros retiros si el depósito se dividió).
5. Obtenés la wallet emisora y el monto total del depósito.

**Bonus**: Si el depósito original se dividió en varios retiros, el bot también muestra los **otros destinatarios** — dándote el panorama completo de a dónde fueron los fondos.

**Ejemplo:**
- Retiro: 7 SOL recibidos por Wallet X.
- Depósito encontrado: 15 SOL por Wallet Z a las 22:17:46.
- Otro destinatario: Wallet Y recibió 8 SOL.
- Resultado: Los 15 SOL de **Wallet Z** se dividieron entre **Wallet X** (7 SOL) y **Wallet Y** (8 SOL).

### Función 3 — Matchear Todo en un Rango Horario

**"Mostrá todos los que usaron el mixer en una ventana de tiempo específica."**

- **Input**: Una fecha y un rango horario UTC (ej: 19:00 a 19:30).
- **Output**: Una lista paginada de todos los pares emisor → destinatario matcheados.

**Cómo usar:**
1. Abrí Privacy Cash Scanner → Seleccioná **"Match all in time range"**.
2. Elegí una fecha: Hoy, Ayer, o ingresá una fecha personalizada (formato DD-MM).
3. Ingresá un rango horario UTC (ej: `19:00 19:30`). Máximo: 2 horas.
4. El bot obtiene toda la actividad de Privacy Cash en esa ventana y matchea cada depósito con sus retiros.
5. Los resultados se muestran de 5 pares por página con navegación Anterior/Siguiente.

**Qué muestran los resultados:**
- Cada par muestra la **wallet emisora**, el **monto del depósito**, y todas las **wallets destinatarias** con sus montos.
- Los depósitos sin match (probablemente bridgeados a otra blockchain) se listan por separado al final.

## Entendiendo los Resultados

| Símbolo | Significado                              |
| ------- | ---------------------------------------- |
| 📤      | Emisor (la wallet que depositó)          |
| 📥      | Destinatario (la wallet que recibió)     |
| 🔗      | Otros destinatarios del mismo depósito   |
| ⚠️      | Bridgeado — los fondos probablemente salieron de Solana |

## Tolerancia y Precisión

- El mixer cobra una pequeña comisión a través de un relayer. SOLFINDER lo contempla con una tolerancia dinámica.
- Las **coincidencias exactas** siempre se priorizan sobre las aproximadas.
- Cuando existen múltiples matches posibles, el bot elige el más cercano en tiempo.

## Limitaciones

- **Bridges cross-chain**: Si alguien deposita SOL en Privacy Cash pero bridgea los fondos a Ethereum u otra red, el retiro no aparecerá en Solana. El bot los marca como "bridgeados" con una nota de que la detección cross-chain estará disponible pronto.
- **Períodos de alto tráfico**: Durante momentos muy activos, puede haber múltiples combinaciones de montos válidas. El bot usa la proximidad temporal para elegir el match más probable.
- **Ventanas de tiempo**: La Función 1 mira 5 minutos hacia adelante. La Función 2 mira ±5 minutos. La Función 3 escanea el rango completo que especifiques (máx 2 horas). Transacciones fuera de estas ventanas no serán matcheadas.

## Tips

- Obtenés firmas de transacciones en [Solscan](https://solscan.io) — buscá una wallet y encontrá la transacción de Privacy Cash en el historial.
- Para la Función 3, empezá con un rango de 30 minutos para obtener resultados rápido. Expandí a 2 horas si es necesario.
- Todos los horarios están en **UTC**. Chequeá la hora UTC actual que muestra el bot antes de ingresar tu rango.
