export type CalendarDate = { year: number; month: number; day: number }

export type ZonedDateTime = CalendarDate & {
  hour: number
  minute: number
  second: number
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const CENTRAL_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function unwrapMatchingMailtoLinks(text: string): string {
  return text.replace(
    /(?<!!)\[([^\]\r\n]+)\]\(mailto:([^\s)]+)\)/gi,
    (link, label: string, address: string) =>
      label.toLowerCase() === address.toLowerCase() ? label : link,
  )
}

function unwrapWhitespaceBoundedUnderscoreEmphasis(text: string): string {
  return text.replace(/(?<!\S)_(\S(?:[^\r\n]*?\S)?)_(?!\S)/g, '$1')
}

function unwrapWhitespaceBoundedAsteriskEmphasis(text: string): string {
  return text.replace(/(?<!\S)\*([^\s*](?:[^\r\n]*?[^\s*])?)\*(?!\S)/g, '$1')
}

function unwrapPdfSuperscriptArtifacts(text: string): string {
  return text
    .replace(
      /(?:^|\r?\n)[ \t]*(st|nd|rd|th)[ \t]*\r?\n([^\r\n]{0,200}<sup(?:\s+[^<>]*?)?\s*>\1<\/sup\s*>[^\r\n]{0,200}?\b\d{1,2})(?=\s+day\b)/gi,
      (_artifact, suffix: string, lineBeforeDay: string) =>
        `\n${lineBeforeDay}${suffix}`,
    )
    .replace(/<sup(?:\s+[^<>]*?)?\s*>|<\/sup\s*>/gi, '')
}

export function normalizeForMatch(text: string): string {
  return unwrapPdfSuperscriptArtifacts(
    unwrapWhitespaceBoundedAsteriskEmphasis(
      unwrapWhitespaceBoundedUnderscoreEmphasis(unwrapMatchingMailtoLinks(text)),
    ),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/<u(?:\s+[^<>]*?)?\s*>|<\/u\s*>/gi, '')
    .replace(/([A-Za-z0-9])-[ \t]*\r?\n[ \t]*(?=[A-Za-z0-9])/g, '$1-')
    .replace(/\s+/g, ' ')
    .trim()
}

export function locateExcerpt(
  normalizedSource: string,
  excerpt: string,
): number {
  const normalizedExcerpt = normalizeForMatch(excerpt)
  if (normalizedExcerpt === '') {
    return -1
  }
  return normalizedSource.indexOf(normalizedExcerpt)
}

const ZONED_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/

function centralParts(date: Date): ZonedDateTime | null {
  const parts = new Map(
    CENTRAL_TIME.formatToParts(date).map((part) => [part.type, part.value]),
  )
  const result = {
    year: Number(parts.get('year')),
    month: Number(parts.get('month')),
    day: Number(parts.get('day')),
    hour: Number(parts.get('hour')),
    minute: Number(parts.get('minute')),
    second: Number(parts.get('second')),
  }
  return Object.values(result).every(Number.isInteger) ? result : null
}

export function parseZonedIsoDateTime(value: string): ZonedDateTime | null {
  const match = ZONED_ISO_PATTERN.exec(value)
  if (!match) {
    return null
  }
  const offset = match[7]
  if (offset !== 'Z') {
    const offsetHours = Number(offset.slice(1, 3))
    const offsetMinutes = Number(offset.slice(4, 6))
    if (offsetHours > 23 || offsetMinutes > 59) {
      return null
    }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  const seconds = match[6] as string | undefined
  const candidate = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(seconds ?? '0'),
  }
  const inCentralTime = centralParts(parsed)
  if (
    !inCentralTime ||
    Object.entries(candidate).some(
      ([key, component]) =>
        inCentralTime[key as keyof ZonedDateTime] !== component,
    )
  ) {
    return null
  }
  return candidate
}

function monthNumberFromName(name: string): number | null {
  const index = MONTH_NAMES.indexOf(name.toLowerCase())
  return index === -1 ? null : index + 1
}

function isValidDate(date: CalendarDate): boolean {
  const parsed = new Date(Date.UTC(date.year, date.month - 1, date.day))
  return (
    parsed.getUTCFullYear() === date.year &&
    parsed.getUTCMonth() === date.month - 1 &&
    parsed.getUTCDate() === date.day
  )
}

export function datesInText(text: string): CalendarDate[] {
  const normalized = normalizeForMatch(text)
  const found: CalendarDate[] = []
  const push = (date: CalendarDate) => {
    if (isValidDate(date)) {
      found.push(date)
    }
  }

  const isoPattern = /(\d{4})-(\d{2})-(\d{2})/g
  for (const match of normalized.matchAll(isoPattern)) {
    push({
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    })
  }

  const numericPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g
  for (const match of normalized.matchAll(numericPattern)) {
    push({
      month: Number(match[1]),
      day: Number(match[2]),
      year: Number(match[3]),
    })
  }

  const monthNamePattern =
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*|\s+)(\d{4})\b/g
  for (const match of normalized.matchAll(monthNamePattern)) {
    const month = monthNumberFromName(match[1])
    if (month !== null) {
      push({ month, day: Number(match[2]), year: Number(match[3]) })
    }
  }

  return found
}

export function textSupportsDate(text: string, date: CalendarDate): boolean {
  return datesInText(text).some(
    (candidate) =>
      candidate.year === date.year &&
      candidate.month === date.month &&
      candidate.day === date.day,
  )
}

function timesInText(
  text: string,
): Array<{ hour: number; minute: number; second: number | null }> {
  const normalized = normalizeForMatch(text)
  const times: Array<{
    hour: number
    minute: number
    second: number | null
  }> = []
  const twelveHourPattern =
    /(?:\(|\b)(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\)?(?:\s+o'clock)?\s*([AP])\.?M\.?\b/gi
  for (const match of normalized.matchAll(twelveHourPattern)) {
    const baseHour = Number(match[1]) % 12
    const second = match[3] as string | undefined
    times.push({
      hour: baseHour + (match[4].toUpperCase() === 'P' ? 12 : 0),
      minute: Number(match[2]),
      second: second === undefined ? null : Number(second),
    })
  }
  const twentyFourHourPattern =
    /\b([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?!\s*[AP]\.?M\.?)\b/gi
  for (const match of normalized.matchAll(twentyFourHourPattern)) {
    const second = match[3] as string | undefined
    times.push({
      hour: Number(match[1]),
      minute: Number(match[2]),
      second: second === undefined ? null : Number(second),
    })
  }
  if (/\b(?:due|no\s+later\s+than|by|before|until)\s+noon\b/i.test(normalized)) {
    times.push({
      hour: 12,
      minute: 0,
      second: null,
    })
  }
  return times
}

export function textSupportsZonedDateTime(
  text: string,
  dateTime: ZonedDateTime,
): boolean {
  if (!textSupportsDate(text, dateTime)) {
    return false
  }
  const times = timesInText(text)
  if (times.length === 0) {
    return dateTime.hour === 0 && dateTime.minute === 0 && dateTime.second === 0
  }
  return times.some(
    (time) =>
      time.hour === dateTime.hour &&
      time.minute === dateTime.minute &&
      (time.second === null
        ? dateTime.second === 0
        : time.second === dateTime.second),
  )
}

export function centsOf(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) {
    return null
  }
  const scaled = value * 100
  const cents = Math.round(scaled)
  if (Math.abs(scaled - cents) > 1e-6) {
    return null
  }
  return cents
}

function centsFromToken(whole: string, fraction: string | undefined): number {
  return (
    Number(whole.replace(/,/g, '')) * 100 +
    Number((fraction ?? '').padEnd(2, '0'))
  )
}

const AMOUNT_SCALE = {
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
} as const

function centsFromMoneyToken(
  whole: string,
  fraction: string | undefined,
  scale: string | undefined,
): number | null {
  const multiplier = scale
    ? AMOUNT_SCALE[scale.toLowerCase() as keyof typeof AMOUNT_SCALE]
    : 1
  const cents = centsFromToken(whole, fraction) * multiplier
  return Number.isSafeInteger(cents) ? cents : null
}

export function textSupportsAmount(text: string, value: number): boolean {
  const expectedCents = centsOf(value)
  if (expectedCents === null) {
    return false
  }
  const normalized = normalizeForMatch(text)
  const moneyPattern =
    /(?<![\dA-Za-z])(?:USD\s*|\$\s*)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?:\s*(thousand|million|billion)\b)?(?:\s*(?:USD\b|dollars?\b))?(?![\dA-Za-z])/gi
  for (const match of normalized.matchAll(moneyPattern)) {
    const token = match[0]
    const fraction = match[2] as string | undefined
    const scale = match[3] as string | undefined
    const hasMoneyMarker = /\$|\bUSD\b|\bdollars?\b/i.test(token)
    const hasMoneyFormatting = match[1].includes(',') || fraction !== undefined
    const hasMoneyEvidence = scale
      ? hasMoneyMarker
      : hasMoneyMarker || hasMoneyFormatting
    if (
      hasMoneyEvidence &&
      centsFromMoneyToken(match[1], fraction, scale) === expectedCents
    ) {
      return true
    }
  }
  return false
}
