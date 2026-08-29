import type { Id } from '../_generated/dataModel'
import { sha256HexOfText } from '../sources/hashing'
import type { SourceKind } from './state'
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

export async function extractionRunKey(input: {
  registryId: Id<'sourceRegistries'>
  snapshotId: Id<'sourceSnapshots'>
  sourceKind: SourceKind
  targetRecordId: string
  promptVersion: string
  schemaVersion: string
  processorVersion: string
}): Promise<string> {
  const inputHash = await sha256HexOfText(
    [
      input.registryId,
      input.snapshotId,
      input.sourceKind,
      input.targetRecordId,
      input.promptVersion,
      input.schemaVersion,
      input.processorVersion,
    ].join('\n'),
  )
  return `extract:${input.processorVersion}:${inputHash}`
}
