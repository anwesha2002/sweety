/** "Asha Rao" -> "AR", "asha" -> "A". Used for the avatar in the navbar. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** "Asha Rao" -> "Asha" */
export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Long, readable date such as "Wednesday, 4 November 2026". */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
