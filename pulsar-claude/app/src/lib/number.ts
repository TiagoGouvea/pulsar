// Accepts pt-BR decimals ("7,5"). Returns null for an empty/invalid field, never 0.
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export const formatDecimal = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
