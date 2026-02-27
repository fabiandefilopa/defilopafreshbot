/**
 * Solana program addresses (to filter out non-wallet accounts)
 */
export const SYSTEM_PROGRAMS = [
  '11111111111111111111111111111111', // System Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
  'ComputeBudget111111111111111111111111111111', // Compute Budget
  'SysvarRent111111111111111111111111111111111', // Sysvar Rent
  'SysvarC1ock11111111111111111111111111111111', // Sysvar Clock
];

export default SYSTEM_PROGRAMS;
