import { v } from 'convex/values'

export const COVERAGE_COMPILER_VERSION = 'v1'

export const ROOT_GATE_VERSION = 'v1'

export const MAX_ROOT_REDIRECTS = 5

export const ROOT_REQUEST_TIMEOUT_MS = 10_000

export const MAX_ERROR_DETAIL_LENGTH = 200

// Later slices extend this literal into a union as they add stages.
export const coverageStageNames = v.literal('verify_root')

export type CoverageStageName = typeof coverageStageNames.type

export const coverageRunStates = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed_retryable'),
  v.literal('failed_terminal'),
  v.literal('canceled'),
  v.literal('superseded'),
)

export type CoverageRunState = typeof coverageRunStates.type

export const coverageStageStates = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed_retryable'),
  v.literal('failed_terminal'),
  v.literal('canceled'),
)

export type CoverageStageState = typeof coverageStageStates.type

export const coverageFindingCodes = v.union(
  v.literal('root_manifest_missing'),
  v.literal('root_url_invalid'),
  v.literal('root_scheme_not_https'),
  v.literal('root_host_not_approved'),
  v.literal('root_document_host_quarantined'),
  v.literal('root_redirect_limit'),
  v.literal('root_redirect_invalid'),
  v.literal('root_request_failed'),
  v.literal('root_status_unsuccessful'),
  v.literal('root_content_type_unexpected'),
  v.literal('root_final_url_mismatch'),
)

export type CoverageFindingCode = typeof coverageFindingCodes.type

export const coverageFindingSeverities = v.union(
  v.literal('blocking'),
  v.literal('warning'),
)

export type CoverageFindingSeverity = typeof coverageFindingSeverities.type

export const coverageRedirectHop = v.object({
  requestedUrl: v.string(),
  status: v.number(),
  locationUrl: v.optional(v.string()),
  contentType: v.optional(v.string()),
})

export type CoverageRedirectHop = typeof coverageRedirectHop.type

export function boundedDetail(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  return collapsed.length > MAX_ERROR_DETAIL_LENGTH
    ? `${collapsed.slice(0, MAX_ERROR_DETAIL_LENGTH)}…`
    : collapsed
}
