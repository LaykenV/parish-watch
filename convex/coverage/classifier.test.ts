import { expect, test } from 'vitest'

import {
  classificationContractError,
  classifierRequest,
  sanitizeSourceClassifications,
} from './classifier'
import type {
  ClassifierCandidate,
  SourceClassificationResponse,
} from './classifier'

const CANDIDATES = [
  {
    candidateId: 'candidate-1',
    canonicalUrl: 'https://www.test.gov/agenda.pdf',
    title: 'September meeting agenda',
    matchedTerms: ['agenda', 'meeting'],
    hostDisposition: 'approved',
  },
] as unknown as ClassifierCandidate[]

function response(
  overrides: Partial<
    SourceClassificationResponse['classifications'][number]
  > = {},
): SourceClassificationResponse {
  return {
    bodyKey: 'test-council',
    classifications: [
      {
        candidateId: 'candidate-1',
        outcome: 'classified',
        sourceKind: 'agenda',
        cadence: 'meeting_cycle',
        confidence: 0.92,
        evidenceText: 'September meeting agenda',
        noGuessReason: '',
        ...overrides,
      },
    ],
  }
}

test('the classifier request uses the fast role and strict versioned schema', () => {
  const request = classifierRequest('test-council', 'Test Council', CANDIDATES)
  expect(request.role).toBe('MODEL_FAST')
  expect(request.schemaName).toBe('coverage_source_classification')
  expect(request.jsonSchema).toMatchObject({
    type: 'object',
    additionalProperties: false,
  })
})

test('classification accepts copied candidate evidence', () => {
  expect(
    classificationContractError('test-council', CANDIDATES, response()),
  ).toBeNull()
})

test('classification rejects invented IDs, changed bodies, and invented evidence', () => {
  expect(
    classificationContractError(
      'test-council',
      CANDIDATES,
      response({ candidateId: 'invented' }),
    ),
  ).toContain('invented')
  expect(
    classificationContractError('another-body', CANDIDATES, response()),
  ).toContain('body')
  expect(
    classificationContractError(
      'test-council',
      CANDIDATES,
      response({ evidenceText: 'words that were never supplied' }),
    ),
  ).toContain('copied')
})

test('an uncertain source must use the explicit no-guess shape', () => {
  const guessed = response({
    outcome: 'uncertain',
    sourceKind: 'agenda',
    cadence: 'monthly',
    confidence: 0.2,
    noGuessReason: 'The title does not establish the document type.',
  })
  expect(
    classificationContractError('test-council', CANDIDATES, guessed),
  ).toContain('guessed')
  const normalized = sanitizeSourceClassifications(CANDIDATES, guessed)
  expect(normalized.classifications[0]).toMatchObject({
    outcome: 'uncertain',
    sourceKind: 'unknown',
    cadence: 'unknown',
  })
  expect(
    classificationContractError('test-council', CANDIDATES, normalized),
  ).toBeNull()
})

test('invented evidence downgrades the row instead of storing the model claim', () => {
  const normalized = sanitizeSourceClassifications(
    CANDIDATES,
    response({ evidenceText: 'invented classification basis' }),
  )
  expect(normalized.classifications[0]).toMatchObject({
    outcome: 'uncertain',
    sourceKind: 'unknown',
    cadence: 'unknown',
    evidenceText: 'https://www.test.gov/agenda.pdf',
  })
  expect(
    classificationContractError('test-council', CANDIDATES, normalized),
  ).toBeNull()
})
