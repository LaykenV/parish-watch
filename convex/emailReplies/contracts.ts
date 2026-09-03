export const MAX_EMAIL_QUESTION_LENGTH = 500

export type InboundEmail = {
  inboxId: string
  threadId: string
  messageId: string
  from: string
  question: string
}

export function parseInboundEmail(value: unknown): InboundEmail | null {
  if (!isRecord(value)) return null
  const inboxId = requiredString(value.inbox_id)
  const threadId = requiredString(value.thread_id)
  const messageId = requiredString(value.message_id)
  const from = parseAddress(requiredString(value.from))
  const question = extractQuestion(
    optionalString(value.extracted_text) ?? optionalString(value.text),
  )
  if (!inboxId || !threadId || !messageId || !from || !question) return null
  return { inboxId, threadId, messageId, from, question }
}

export function parseAddress(value: string | null): string | null {
  if (!value) return null
  const bracketed = value.match(/<([^<>]+)>\s*$/)?.[1]
  const candidate = (bracketed ?? value).trim().toLowerCase()
  if (
    candidate.length < 3 ||
    candidate.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)
  ) {
    return null
  }
  return candidate
}

export function extractQuestion(value: string | null): string | null {
  if (!value) return null
  const lines = value.replaceAll('\r\n', '\n').split('\n')
  const kept: string[] = []
  for (const line of lines) {
    if (/^on .+ wrote:$/i.test(line.trim())) break
    if (/^-{2,}\s*original message\s*-{2,}$/i.test(line.trim())) break
    if (line.trimStart().startsWith('>')) continue
    kept.push(line)
  }
  const question = kept.join('\n').trim()
  if (question.length === 0 || question.length > MAX_EMAIL_QUESTION_LENGTH) {
    return null
  }
  return question
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
