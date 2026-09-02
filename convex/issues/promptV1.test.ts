import { describe, expect, test } from 'vitest'

import { buildIssueLinkPromptV1 } from './promptV1'

describe('issue link prompt', () => {
  test('gives the linker the exact dynamic fact-path contract', () => {
    const prompt = buildIssueLinkPromptV1({ records: [] })
    const system = prompt.messages[0]?.content ?? ''

    expect(system).toContain('/title, /summary, /lifecycleState')
    expect(system).toContain('/topics/<index>')
    expect(system).toContain('/links/<index>/reason')
    expect(system).toContain('/sharedSignals/<index>/value')
    expect(system).toContain('/importanceFactors/<factor>/rationale')
    expect(system).toContain(
      'Do not return facts for a link recordId or relationship',
    )
    expect(system).toContain('each expected path exactly once')
  })
})
