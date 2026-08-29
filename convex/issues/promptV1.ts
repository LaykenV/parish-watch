import type { IssueCandidateV1 } from './contractV1'

type IssueEvidenceRecord = {
  recordId: string
  sourceRecordId: string
  publicationVersionId: string
  payloadJson: string
  citations: Array<{
    citationId: string
    fieldPath: string
    excerpt: string
    page: number | null
    section: string | null
  }>
}

export function buildIssueLinkPromptV1(input: {
  records: IssueEvidenceRecord[]
}) {
  const evidence = input.records.map((record) => ({
    recordId: record.recordId,
    sourceRecordId: record.sourceRecordId,
    publicationVersionId: record.publicationVersionId,
    payload: JSON.parse(record.payloadJson) as unknown,
    citations: record.citations,
  }))
  return {
    messages: [
      {
        role: 'system' as const,
        content: [
          'You link atomic local-government decisions into one neutral resident issue.',
          'Use only the supplied published payloads and citation excerpts.',
          'Never merge records based on similar titles alone.',
          'A shared signal must quote the same concrete identifier, counterparty, project, location, or transaction from citations that span every record.',
          "The government's own body name or home jurisdiction does not establish a link.",
          'Keep every input decision as a separate link. Do not invent an outcome, amount, deadline, consequence, or relationship.',
          'For importance, return all seven factors. Use absent with a blank rationale when the evidence does not support a factor.',
          'Use low, moderate, or high only when cited evidence supports the rationale.',
          'A non-absent importance rationale must state the documented consequence of the approved or proposed action. Naming only the subject is not enough.',
          'For public assets, say what the decision authorizes the government to transfer, acquire, sell, lease, or otherwise do with the asset, using only cited facts.',
          'Each material output field needs exactly one fact. Each fact names existing citation IDs.',
          'Every fact value must copy its corresponding output field exactly, character for character. Never paraphrase a field in its fact.',
          'For each non-absent importance factor, use /importanceFactors/<factor>/rationale as the fact path and copy the rationale exactly into fact.value.',
          'Link-reason facts need citations from that record and at least one other record.',
          'Use plain, nonpartisan language. Describe consequence and process, not whether a decision is good or bad.',
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: `PUBLICATION EVIDENCE BEGIN\n${JSON.stringify(evidence)}\nPUBLICATION EVIDENCE END`,
      },
    ],
  }
}

export function buildIssueReviewPromptV1(input: {
  candidate: IssueCandidateV1
  facts: Array<{
    fieldPath: string
    value: string
    citations: Array<{
      citationId: string
      recordId: string
      sourceRecordId: string
      fieldPath: string
      excerpt: string
      page: number | null
      section: string | null
    }>
  }>
}) {
  return {
    messages: [
      {
        role: 'system' as const,
        content: [
          'You independently review a proposed local-government issue.',
          'Judge every fact against only its cited excerpts. You cannot repair or replace candidate fields.',
          'Mark supported only when the excerpts directly support the exact value and the neutral wording.',
          'A link reason must have evidence from the named decision and at least one other decision.',
          'A shared signal must appear concretely in citations spanning every input decision.',
          'Importance rationales must describe a documented consequence. Do not infer missing amounts, affected people, deadlines, or outcomes.',
          'Use fail for an unsupported title, summary, link, shared signal, or any global integrity problem.',
          'Use limited when only secondary fields or importance factors are unclear or unsupported.',
          'Return exactly one check per fact and a verdict consistent with the checks and findings.',
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: `ISSUE CANDIDATE AND CITATIONS BEGIN\n${JSON.stringify(input)}\nISSUE CANDIDATE AND CITATIONS END`,
      },
    ],
  }
}
