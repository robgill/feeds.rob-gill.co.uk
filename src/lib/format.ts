const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

export function formatWhen(value: Date | string | null | undefined): string {
  if (!value) return "Not yet";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return londonTime.format(date);
}

export function scheduleLabel(cadence: string, time: string, timezone: string): string {
  const when = cadence === "daily" ? "Daily" : cadence;
  return `${when} at ${time} ${timezone}`;
}

export function statusLabel(status: string): string {
  if (status === "ok") return "OK";
  if (status === "error") return "Failed";
  return status;
}

export function formatLabel(format: string): string {
  if (format === "summary") return "Summary";
  if (format === "full") return "Full";
  return format;
}

export function hostLabel(link: string | null): string | null {
  if (!link) return null;
  try {
    return new URL(link).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
