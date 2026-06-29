// Form-value coercion for optional fields: an empty/whitespace string becomes
// `undefined` so the key is omitted from the JSON payload (rather than sent as '').

// '' -> undefined; otherwise the trimmed string.
export const str = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim());

// '' or non-numeric -> undefined; otherwise the parsed number.
export const num = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
};
