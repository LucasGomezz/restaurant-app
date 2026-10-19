const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Visit dates are stored as midnight UTC; format in UTC so they don't shift a day.
  timeZone: "UTC",
});

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "10 may 2026": for tight spots like map popups. */
export function formatShortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortDateFormatter.format(date);
}

/** `YYYY-MM-DD` for `<input type="date">` default values. */
export function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

/** "3–10 de marzo de 2026"; a single date when there's no end. */
export function formatDateRange(start: string, end: string | null): string {
  if (!end) return formatDate(start);
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return formatDate(start);
  }
  return dateFormatter.formatRange(from, to);
}
