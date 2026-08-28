import type { Id } from '../_generated/dataModel'
import { sha256HexOfText } from '../sources/hashing'
import { RETRIEVAL_PROCESSOR_VERSION } from './state'

export async function retrievalAttemptKey(
  registryId: Id<'sourceRegistries'>,
  canonicalUrl: string,
): Promise<string> {
  const inputHash = await sha256HexOfText(`${registryId}\n${canonicalUrl}`)
  return `retrieve-attempt:${RETRIEVAL_PROCESSOR_VERSION}:${inputHash}`
}

export async function retrievalContentKey(
  registryId: Id<'sourceRegistries'>,
  canonicalUrl: string,
  rawContentHash: string,
): Promise<string> {
  const inputHash = await sha256HexOfText(
    `${registryId}\n${canonicalUrl}\n${rawContentHash}`,
  )
  return `retrieve:${RETRIEVAL_PROCESSOR_VERSION}:${inputHash}`
}
