const MAX_MEETING_KEY_LENGTH = 180

export function residentMeetingKey(
  bodySlug: string,
  meetingAt: string,
): string {
  const instant = meetingAt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${bodySlug}-${instant}`.slice(0, MAX_MEETING_KEY_LENGTH)
}
