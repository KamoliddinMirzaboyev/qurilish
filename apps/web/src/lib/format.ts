const numberFormatter = new Intl.NumberFormat("uz-UZ");
const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Tashkent",
});
const dateTimeFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tashkent",
});

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null) return "Kelishilgan holda";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "Kelishilgan holda";
  return `${numberFormatter.format(num)} so'm`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatRelative(value: string | Date): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return "hozirgina";
  if (diffMinutes < 60) return `${diffMinutes} daqiqa oldin`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} soat oldin`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} kun oldin`;
  return formatDate(date);
}

export function formatProposalCount(count: number): string {
  return `${formatNumber(count)} ta taklif`;
}
