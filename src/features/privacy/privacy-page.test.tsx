import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PrivacyPage } from './privacy-page'

describe('privacy notice', () => {
  it('states the current resident data boundaries and contact path', () => {
    const html = renderToStaticMarkup(<PrivacyPage />)

    expect(html).toContain('Your civic questions are not public.')
    expect(html).toContain('Browser access expires after 24 hours')
    expect(html).toContain('Individual event records expire after 90 days')
    expect(html).toContain('does not send your Google email to OpenAI')
    expect(html).toContain('public-parish-reports@agentmail.to')
    expect(html).toContain('Request access to or deletion')
  })
})
