const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function formatApplicationDate(value: string): string {
  // These are calendar dates, so a local time zone must not shift the day.
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}
