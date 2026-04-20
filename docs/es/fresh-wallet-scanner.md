# Fresh Wallet Scanner

## Qué Hace

El Fresh Wallet Scanner detecta **wallets nuevas** en Solana que solo recibieron fondos y nunca enviaron nada. Estas wallets suelen ser señal de **smart money entrando al mercado** — alguien retirando de un exchange a una wallet limpia antes de su próximo movimiento.

## Por Qué Importa

Cuando traders experimentados o instituciones mueven fondos, suelen:

1. Retirar de un exchange (Binance, OKX, Bybit, etc.) a una wallet nueva.
2. Usar esa wallet fresca para comprar tokens, entrar a DeFi o fondear otras wallets.

Al detectar estas wallets frescas temprano, podés ver **qué está haciendo el smart money antes de que pase**.

## Cómo Funciona

1. **Seleccioná Exchanges** — Elegí qué exchanges monitorear. El bot rastrea wallets de 15+ exchanges incluyendo Binance, OKX, Bybit, Kucoin, MEXC y más.

2. **Configurá un Filtro** — Definí qué buscás:
   - **Rango**: Wallets que recibieron entre X e Y SOL (ej: `1 3` para 1-3 SOL).
   - **Objetivo**: Wallets que recibieron aproximadamente X SOL (ej: `2.5` para ~2.5 SOL).

3. **Elegí Modo de Escaneo**:
   - **Simple**: Encuentra wallets que recibieron fondos directamente del exchange.
   - **Modo Hopping**: Sigue hasta 3 "saltos" — si el exchange envía a Wallet A, luego A envía a B, y B envía a C, el bot rastrea toda la cadena hasta encontrar wallets verdaderamente frescas al final.

4. **Mirá los Resultados** — El bot muestra cada wallet detectada con:
   - La dirección de la wallet.
   - El monto recibido.
   - El camino que siguió (si se usó modo hopping).
   - El timestamp de cuándo ocurrió la transferencia.

## Exchanges Soportados

| Exchange   | Exchange   | Exchange     |
| ---------- | ---------- | ------------ |
| Binance    | Kucoin     | Coinbase     |
| OKX        | BingX      | HTX          |
| Bybit      | MEXC       | WhiteBIT     |
| Bitfinex   | Gate.io    | HitBTC       |
|            |            | ChangeNOW    |

## Ejemplo de Uso

> Querés ver si alguna ballena está acumulando SOL silenciosamente retirando 10-50 SOL de Binance a wallets frescas.

1. Seleccioná **Binance**.
2. Ingresá filtro: `10 50`.
3. Elegí **Modo Hopping**.
4. Tocá **Scan Now**.

El bot devuelve todas las wallets que coinciden — wallets que solo recibieron SOL y nunca enviaron.

## Tips

- **Modo Hopping** es más exhaustivo pero tarda más. Usalo cuando sospeches que los fondos pasan por wallets intermedias.
- **Modo Simple** es más rápido e ideal para transferencias directas exchange-a-wallet.
- Podés seleccionar **múltiples exchanges** a la vez para un escaneo más amplio.
- Usá el botón **Run Again** para repetir el mismo escaneo con resultados actualizados.
