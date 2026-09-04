import { v } from 'convex/values'

export const browserCivicEvent = v.union(v.literal('evidence_opened'), v.literal('official_source_opened'), v.literal('issue_returned'), v.literal('outcome_read'))
export const civicEvent = v.union(browserCivicEvent, v.literal('ask_submitted'), v.literal('ask_answered'), v.literal('follow_created'), v.literal('coverage_requested'))
export type BrowserCivicEvent = typeof browserCivicEvent.type
export type CivicEvent = typeof civicEvent.type
export const BROWSER_CIVIC_EVENTS: readonly string[] = ['evidence_opened', 'official_source_opened', 'issue_returned', 'outcome_read']
