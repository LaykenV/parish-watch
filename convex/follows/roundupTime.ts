const TIME_ZONE = 'America/Chicago'

type CivilParts = {
  year: number
  month: number
  day: number
  weekday: string
  hour: number
}

export type WeeklyRoundupWindow = {
  key: string
  startsAt: number
  endsAt: number
}

export function weeklyRoundupWindowAt(
  now: number,
): WeeklyRoundupWindow | null {
  const local = civilParts(now)
  if (local.weekday !== 'Mon' || local.hour !== 7) return null
  const endsAt = civilToUtc(local.year, local.month, local.day, 7)
  const prior = new Date(Date.UTC(local.year, local.month - 1, local.day - 7))
  const startsAt = civilToUtc(
    prior.getUTCFullYear(),
    prior.getUTCMonth() + 1,
    prior.getUTCDate(),
    7,
  )
  return {
    key: `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`,
    startsAt,
    endsAt,
  }
}

function civilParts(timestamp: number): CivilParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    weekday: parts.find((part) => part.type === 'weekday')?.value ?? '',
    hour: value('hour'),
  }
}

function civilToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
): number {
  const desired = Date.UTC(year, month - 1, day, hour)
  let candidate = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = civilParts(candidate)
    const rendered = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
    )
    candidate += desired - rendered
  }
  return candidate
}
