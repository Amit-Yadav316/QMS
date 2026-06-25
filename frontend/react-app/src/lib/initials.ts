// Returns up to two uppercase initials from a person's full name.
// initials('Rajesh Sharma') -> 'RS'; initials(undefined) -> '—'
export function initials(fullName?: string | null): string {
  if (!fullName) return '—';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + second).toUpperCase();
}

// Converts a backend role enum (e.g. CONTRACTOR_ADMIN) to a display label
// ("Contractor Admin").
export function roleLabel(role?: string | null): string {
  if (!role) return '';
  return role
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
