import type { clockDateFormat, timeFormat } from './types.js';

export const DEFAULT_CLOCK_DATE_FORMAT: clockDateFormat = 'DOW, Mon ##';
export const CLOCK_TICK_GUARD_MS = 20;

export interface ClockTimeParts {
  time: string;
  period: string;
  periodPosition: 'before' | 'after';
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const formatter = (locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }

  const fallbackOptions = { ...options };
  delete fallbackOptions.timeZone;
  const attempts: Array<[string | undefined, Intl.DateTimeFormatOptions]> = [
    [locale, options],
    [locale, fallbackOptions],
    [undefined, options],
    [undefined, fallbackOptions],
  ];
  let result: Intl.DateTimeFormat | undefined;
  for (const [candidateLocale, candidateOptions] of attempts) {
    try {
      result = new Intl.DateTimeFormat(candidateLocale, candidateOptions);
      break;
    } catch {
      // Try again while preserving whichever of locale/time-zone is valid.
    }
  }
  result ??= new Intl.DateTimeFormat();

  // Config edits can create new formatter combinations. Keep the cache bounded
  // for long-running wall displays where the page may stay open for months.
  if (formatterCache.size >= 32) {
    const oldestKey = formatterCache.keys().next().value;
    if (oldestKey !== undefined) {
      formatterCache.delete(oldestKey);
    }
  }
  formatterCache.set(key, result);
  return result;
};

const resolvedHourCycle = (configuredFormat: timeFormat, systemTimeFormat?: string): 'h12' | 'h23' | undefined => {
  if (configuredFormat === '12hour') {
    return 'h12';
  }
  if (configuredFormat === '24hour') {
    return 'h23';
  }
  if (systemTimeFormat === '12') {
    return 'h12';
  }
  if (systemTimeFormat === '24') {
    return 'h23';
  }
  return undefined;
};

const timeOptions = (
  configuredFormat: timeFormat,
  systemTimeFormat: string | undefined,
  timeZone: string | undefined,
  includeSeconds: boolean,
): Intl.DateTimeFormatOptions => {
  const hourCycle = resolvedHourCycle(configuredFormat, systemTimeFormat);
  return {
    hour: hourCycle === 'h23' ? '2-digit' : 'numeric',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' as const } : {}),
    ...(hourCycle ? { hourCycle } : {}),
    ...(timeZone ? { timeZone } : {}),
  };
};

export const formatClockTime = (date: Date, configuredFormat: timeFormat, locale?: string, systemTimeFormat?: string, timeZone?: string): ClockTimeParts => {
  const parts = formatter(locale, timeOptions(configuredFormat, systemTimeFormat, timeZone, false)).formatToParts(date);
  const periodIndex = parts.findIndex((part) => part.type === 'dayPeriod');
  const hourIndex = parts.findIndex((part) => part.type === 'hour');

  return {
    time: parts
      .filter((part) => part.type !== 'dayPeriod')
      .map((part) => part.value)
      .join('')
      .trim(),
    period: parts.find((part) => part.type === 'dayPeriod')?.value ?? '',
    periodPosition: periodIndex !== -1 && periodIndex < hourIndex ? 'before' : 'after',
  };
};

export const formatClockAriaTime = (
  date: Date,
  configuredFormat: timeFormat,
  locale?: string,
  systemTimeFormat?: string,
  timeZone?: string,
  includeSeconds = false,
): string => formatter(locale, timeOptions(configuredFormat, systemTimeFormat, timeZone, includeSeconds)).format(date);

interface ZonedDateParts {
  year: string;
  yearShort: string;
  month: string;
  day: string;
  dayNumber: string;
}

const zonedDateParts = (date: Date, timeZone?: string): ZonedDateParts => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'gregory',
    ...(timeZone ? { timeZone } : {}),
  };
  const parts = formatter('en-US-u-nu-latn', options).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value ?? '';
  const year = part('year');
  const day = part('day');

  return {
    year,
    yearShort: year.slice(-2),
    month: part('month'),
    day,
    dayNumber: String(Number(day)),
  };
};

const namedDatePart = (date: Date, locale: string | undefined, type: 'weekday' | 'month', width: 'short' | 'long', timeZone?: string): string =>
  formatter(locale, {
    [type]: width,
    calendar: 'gregory',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);

export const formatClockDate = (date: Date, requestedFormat: clockDateFormat, locale?: string, timeZone?: string): string => {
  if (Number.isNaN(date.getTime()) || requestedFormat === 'none') {
    return '';
  }
  if (requestedFormat === 'system') {
    return formatter(locale, timeZone ? { timeZone } : {}).format(date);
  }

  switch (requestedFormat) {
    case 'MM/dd/yyyy': {
      const { year, month, day } = zonedDateParts(date, timeZone);
      return `${month}/${day}/${year}`;
    }
    case 'MM/dd/yy': {
      const { yearShort, month, day } = zonedDateParts(date, timeZone);
      return `${month}/${day}/${yearShort}`;
    }
    case 'dd/MM/yyyy': {
      const { year, month, day } = zonedDateParts(date, timeZone);
      return `${day}/${month}/${year}`;
    }
    case 'dd/MM/yy': {
      const { yearShort, month, day } = zonedDateParts(date, timeZone);
      return `${day}/${month}/${yearShort}`;
    }
    case 'yyyy-MM-dd': {
      const { year, month, day } = zonedDateParts(date, timeZone);
      return `${year}-${month}-${day}`;
    }
    default: {
      const { year, dayNumber } = zonedDateParts(date, timeZone);
      const weekday =
        requestedFormat.startsWith('DOW,') || !['Mon ##, yyyy', 'Month ##, yyyy', '## Mon yyyy'].includes(requestedFormat)
          ? namedDatePart(date, locale, 'weekday', 'short', timeZone)
          : '';
      const useLongMonth = requestedFormat === 'DOW, Month ##' || requestedFormat === 'Month ##, yyyy';
      const monthName = namedDatePart(date, locale, 'month', useLongMonth ? 'long' : 'short', timeZone);

      switch (requestedFormat) {
        case 'DOW, Month ##':
        case 'DOW, Mon ##':
          return `${weekday}, ${monthName} ${dayNumber}`;
        case 'DOW, ## Mon':
          return `${weekday}, ${dayNumber} ${monthName}`;
        case 'Mon ##, yyyy':
        case 'Month ##, yyyy':
          return `${monthName} ${dayNumber}, ${year}`;
        case '## Mon yyyy':
          return `${dayNumber} ${monthName} ${year}`;
        default:
          return `${weekday}, ${monthName} ${dayNumber}`;
      }
    }
  }
};

export const millisecondsUntilNextClockTick = (nowMs: number, showSeconds: boolean, guardMs = CLOCK_TICK_GUARD_MS): number => {
  const period = showSeconds ? 1_000 : 60_000;
  const elapsed = ((nowMs % period) + period) % period;
  return period - elapsed + guardMs;
};
