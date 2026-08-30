const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Chicago',
  year: 'numeric',
})

const DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Chicago',
})

const TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Chicago',
  timeZoneName: 'short',
})

function parseDate(iso: string): Date {
  const withTime = iso.includes('T') ? iso : `${iso}T12:00:00`
  return new Date(withTime)
}

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(parseDate(iso))
}

export function formatDay(iso: string): string {
  return DAY_FORMAT.format(parseDate(iso))
}

export function formatTime(iso: string): string {
  return TIME_FORMAT.format(parseDate(iso))
}
