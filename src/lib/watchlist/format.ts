import { exchangeByCountry, type Country } from "./model";

// Intl formatters are expensive to build; with hundreds of live cells they must be cached.
const numberFormatters = new Map<string, Intl.NumberFormat>();
const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(locale: string, decimals: number) {
  const key = `${locale}|${decimals}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(value: number | null | undefined, country: Country, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return numberFormatter(exchangeByCountry[country].locale, decimals).format(value);
}

export function formatInt(value: number | null | undefined, country: Country) {
  return formatNumber(value == null ? value : Math.round(value), country, 0);
}

export function formatSigned(value: number | null | undefined, country: Country, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  const text = formatNumber(Math.abs(value), country, decimals);
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;
}

export function formatPercent(value: number | null | undefined, country: Country) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatSigned(value, country, 2)}%`;
}

/** Trade time in the instrument's exchange time zone (WL-38). */
export function formatExchangeTime(epochMs: number | null | undefined, country: Country) {
  if (epochMs == null) return "—";
  const { locale, timeZone } = exchangeByCountry[country];
  const key = `${locale}|${timeZone}`;
  let formatter = timeFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    timeFormatters.set(key, formatter);
  }
  return formatter.format(epochMs);
}
