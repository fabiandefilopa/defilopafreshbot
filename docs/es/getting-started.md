# Primeros Pasos

## ¿Qué es SOLFINDER?

SOLFINDER es un bot de Telegram que analiza actividad on-chain en la blockchain de Solana. Te ayuda a:

- **Rastrear smart money** que entra al mercado a través de exchanges.
- **Trazar fondos** que pasan por protocolos de privacidad/mixing.
- **Identificar wallets** involucradas en transacciones ofuscadas.

Todo el análisis usa datos públicos de la blockchain. No se necesitan claves privadas, conexión de wallet, ni registro.

## Cómo Usar

1. Abrí Telegram y buscá el bot (contactanos para obtener el link).
2. Enviá `/start` para abrir el menú principal.
3. Elegí una herramienta:
   - **Fresh Wallet Scanner** — para encontrar wallets nuevas fondeadas desde exchanges.
   - **Privacy Cash Scanner** — para rastrear transacciones del mixer.
4. Seguí las instrucciones en pantalla.

## Comandos

| Comando    | Descripción                           |
| ---------- | ------------------------------------- |
| `/start`   | Abrir el menú principal               |
| `/cancel`  | Cancelar la operación actual          |
| `/help`    | Mostrar ayuda e instrucciones de uso  |

## Requisitos

- Una cuenta de Telegram.
- Conocimiento básico de wallets y transacciones en Solana.
- Firmas de transacciones (para el Privacy Cash Scanner) — las podés obtener de exploradores como [Solscan](https://solscan.io).

## Horarios y Fechas

Todos los horarios del bot están en **UTC**. Si estás en otra zona horaria, tené en cuenta la conversión:

| Tu Zona Horaria   | Diferencia UTC | Ejemplo: 21:00 local = |
| ------------------ | -------------- | ----------------------- |
| EST (EEUU)         | UTC-5          | 02:00 UTC (día siguiente) |
| ART (Argentina)    | UTC-3          | 00:00 UTC (día siguiente) |
| CET (Europa)       | UTC+1          | 20:00 UTC               |
| JST (Japón)        | UTC+9          | 12:00 UTC               |

Tené esto en cuenta al seleccionar fechas y rangos horarios en la Función 3 del Privacy Cash Scanner.
