const numberFormatterCache = new Map<string, Intl.NumberFormat>();

const getNumberFormatter = (locale: string | undefined, minimumFractionDigits: number, maximumFractionDigits: number): Intl.NumberFormat => {
  const key = `${locale ?? ''}|${minimumFractionDigits}|${maximumFractionDigits}`;
  const cached = numberFormatterCache.get(key);
  if (cached) {
    return cached;
  }

  // Bound this shared cache so repeatedly editing a locale in the visual
  // editor cannot grow it for the lifetime of the dashboard.
  if (numberFormatterCache.size >= 32) {
    numberFormatterCache.delete(numberFormatterCache.keys().next().value as string);
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  numberFormatterCache.set(key, formatter);
  return formatter;
};

export const toFiniteNumber = (value: unknown): number | undefined => {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

export const formatFiniteNumber = (
  value: unknown,
  locale: string | undefined,
  minimumFractionDigits = 0,
  maximumFractionDigits = minimumFractionDigits,
  fallback = '---',
): string => {
  const numericValue = toFiniteNumber(value);
  if (numericValue === undefined) {
    return fallback;
  }

  return getNumberFormatter(locale, minimumFractionDigits, maximumFractionDigits).format(numericValue);
};
