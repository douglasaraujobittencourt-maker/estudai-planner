// Local-date helpers. Using toISOString() slices UTC, which flips the
// "today" boundary at 21:00 in Brazil (UTC-3) and resets the day's data.

export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysStr(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return localDateStr(d);
}
