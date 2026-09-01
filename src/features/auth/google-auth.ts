import { useAuthActions, useConvexAuth } from '@convex-dev/auth/react'
import {
  useOauth,
  useSignInWithGoogle,
} from '@convex-dev/auth/providers/oauth/react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'

const OAUTH_ERROR_MESSAGES = {
  access_denied: 'Google sign-in was canceled.',
  expired: 'The Google sign-in request expired. Try again.',
  invalid_flow: 'Public Parish could not restore that sign-in request.',
  oauth_error: 'Google sign-in did not finish. Try again.',
  rejected: 'Public Parish could not use that Google account.',
} as const

export function useGoogleAuth() {
  const auth = useConvexAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const { signOut } = useAuthActions()
  const { flowError } = useOauth()
  const { signInGoogle } = useSignInWithGoogle(api.auth)

  return {
    ...auth,
    error:
      flowError === null
        ? startError
        : flowError.code === 'rejected' && flowError.message
          ? flowError.message
          : OAUTH_ERROR_MESSAGES[flowError.code],
    isSigningIn,
    signInGoogle: async () => {
      setIsSigningIn(true)
      setStartError(null)
      try {
        await signInGoogle({ redirectTo: window.location.href })
      } catch {
        setStartError(
          'Google sign-in could not start. Check your connection and try again.',
        )
        setIsSigningIn(false)
      }
    },
    signOut,
  }
}
