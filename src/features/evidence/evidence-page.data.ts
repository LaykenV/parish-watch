import type { IssueCardData } from '../discovery/contracts'
import type {
  DecisionDetailFixture,
  EvidenceScenario,
  IssueDetailFixture,
  IssueLiveUpdate,
  MeetingDetailFixture,
} from './contracts'

export type IssuePageData = {
  fixture: IssueDetailFixture
  liveUpdate: IssueLiveUpdate | null
}

export type MeetingPageData = {
  fixture: MeetingDetailFixture
  issues: IssueCardData[]
}

export async function loadIssuePageData(
  slug: string,
  scenario: EvidenceScenario | undefined,
): Promise<IssuePageData | null> {
  if (!import.meta.env.DEV || !scenario) return null

  const { ISSUE_DETAIL_FIXTURES, ISSUE_LIVE_UPDATE } = await import(
    './fixtures'
  )
  const fixture = ISSUE_DETAIL_FIXTURES[slug]
  if (!fixture) return null

  return {
    fixture,
    liveUpdate:
      scenario === 'update' && slug === 'drainage-fee-credit-cap'
        ? ISSUE_LIVE_UPDATE
        : null,
  }
}

export async function loadDecisionPageData(
  recordKey: string,
  scenario: EvidenceScenario | undefined,
): Promise<DecisionDetailFixture | null> {
  if (!import.meta.env.DEV || !scenario) return null

  const { DECISION_DETAIL_FIXTURES } = await import('./record-fixtures')
  return DECISION_DETAIL_FIXTURES[recordKey] ?? null
}

export async function loadMeetingPageData(
  meetingId: string,
  scenario: EvidenceScenario | undefined,
): Promise<MeetingPageData | null> {
  if (!import.meta.env.DEV || !scenario) return null

  const [{ ISSUE_FIXTURES }, { MEETING_DETAIL_FIXTURES }] = await Promise.all([
    import('../discovery/fixtures'),
    import('./record-fixtures'),
  ])
  const fixture = MEETING_DETAIL_FIXTURES[meetingId]
  if (!fixture) return null

  const issues = fixture.meeting.issueSlugs
    .map((slug) => ISSUE_FIXTURES.find((issue) => issue.slug === slug))
    .filter((issue): issue is IssueCardData => Boolean(issue))
    .map((issue) => ({
      ...issue,
      href: `/issues/${issue.slug}?fixture=${scenario}`,
    }))

  return { fixture, issues }
}
