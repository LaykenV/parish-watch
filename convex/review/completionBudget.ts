export const REVIEW_REASONING_HEADROOM_TOKENS = 6000

// max_completion_tokens covers both hidden reasoning and visible JSON. The
// reasoning allowance covers the observed 5,178-token high-effort review. The
// JSON allowance keeps a 4,000-token floor for ordinary reviews, then scales at
// the observed typical rate of about 60 tokens per check with 1,000 tokens for
// findings and response overhead. The 100-check contract maximum receives
// 13,000 total tokens.
const REVIEW_MIN_JSON_BUDGET_TOKENS = 4000
const REVIEW_JSON_OVERHEAD_TOKENS = 1000
const REVIEW_JSON_TOKENS_PER_CHECK = 60

export function reviewJsonBudgetTokens(checkCount: number): number {
  const normalizedCheckCount = Math.max(0, Math.trunc(checkCount))
  return Math.max(
    REVIEW_MIN_JSON_BUDGET_TOKENS,
    REVIEW_JSON_OVERHEAD_TOKENS +
      normalizedCheckCount * REVIEW_JSON_TOKENS_PER_CHECK,
  )
}

export function reviewMaxCompletionTokens(checkCount: number): number {
  return REVIEW_REASONING_HEADROOM_TOKENS + reviewJsonBudgetTokens(checkCount)
}
