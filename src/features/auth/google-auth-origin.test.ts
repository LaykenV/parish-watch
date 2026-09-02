import { describe, expect, it } from 'vitest'

import {
  consumeGoogleSignInHandoff,
  googleSignInHandoffUrl,
} from './google-auth-origin'

describe('Google sign-in origin handoff', () => {
  it('moves the submission URL to the matching canonical page', () => {
    const result = googleSignInHandoffUrl(
      'https://befitting-flamingo-587.convex.site/following/areas-and-topics?returnTo=%2Fissues%2Fdrainage&followKind=issue&followKey=drainage&followCadence=both#saved',
    )
    const handoff = new URL(result ?? '')

    expect(handoff.origin).toBe('https://www.publicparish.com')
    expect(handoff.pathname).toBe('/following/areas-and-topics')
    expect(handoff.searchParams.get('returnTo')).toBe('/issues/drainage')
    expect(handoff.searchParams.get('followKey')).toBe('drainage')
    expect(handoff.searchParams.get('followCadence')).toBe('both')
    expect(handoff.searchParams.get('googleSignIn')).toBe('1')
    expect(handoff.hash).toBe('#saved')
  })

  it('does not hand off canonical, development, or invalid URLs', () => {
    expect(
      googleSignInHandoffUrl('https://www.publicparish.com/following'),
    ).toBeNull()
    expect(googleSignInHandoffUrl('http://localhost:3000/following')).toBeNull()
    expect(googleSignInHandoffUrl('not a URL')).toBeNull()
  })

  it('consumes the marker only on the canonical production origin', () => {
    expect(
      consumeGoogleSignInHandoff(
        'https://www.publicparish.com/following?returnTo=%2Fexplore&googleSignIn=1#saved',
      ),
    ).toBe('https://www.publicparish.com/following?returnTo=%2Fexplore#saved')
    expect(
      consumeGoogleSignInHandoff(
        'https://befitting-flamingo-587.convex.site/following?googleSignIn=1',
      ),
    ).toBeNull()
    expect(
      consumeGoogleSignInHandoff(
        'https://www.publicparish.com/following?googleSignIn=0',
      ),
    ).toBeNull()
  })

  it('removes the marker when it is the only query parameter', () => {
    expect(
      consumeGoogleSignInHandoff(
        'https://www.publicparish.com/following?googleSignIn=1',
      ),
    ).toBe('https://www.publicparish.com/following')
  })
})
