import { useAuthActions, useConvexAuth } from '@convex-dev/auth/react'
import {
  useOauth,
  useSignInWithGoogle,
} from '@convex-dev/auth/providers/oauth/react'
import { useCallback, useEffect, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import {
  consumeGoogleSignInHandoff,
  googleSignInHandoffUrl,
} from './google-auth-origin'

export const AUTH_RETURN_KEY = 'public-parish:google-return-to'

const OAUTH_ERROR_MESSAGES = {
  access_denied: 'Google sign-in was canceled.',
  expired: 'The Google sign-in request expired. Try again.',
  invalid_flow: 'Public Parish could not restore that sign-in request.',
  oauth_error: 'Google sign-in did not finish. Try again.',
  rejected: 'Public Parish could not use that Google account.',
} as const

export function useGoogleAuth(returnTo?: string) {
  const auth = useConvexAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const { signOut } = useAuthActions()
  const { flowError } = useOauth()
  const { signInGoogle } = useSignInWithGoogle(api.auth)

  const rememberReturnTo = useCallback(() => {
    if (returnTo) window.sessionStorage.setItem(AUTH_RETURN_KEY, returnTo)
    else window.sessionStorage.removeItem(AUTH_RETURN_KEY)
  }, [returnTo])

  const startGoogleSignIn = useCallback(
    async (redirectTo: string) => {
      setIsSigningIn(true)
      setStartError(null)
      try {
        await signInGoogle({ redirectTo })
      } catch {
        setStartError(
          'Google sign-in could not start. Check your connection and try again.',
        )
        setIsSigningIn(false)
      }
    },
    [signInGoogle],
  )

  useEffect(() => {
    if (auth.isLoading) return

    const redirectTo = consumeGoogleSignInHandoff(window.location.href)
    if (!redirectTo) return

    rememberReturnTo()
    const cleanUrl = new URL(redirectTo)
    window.history.replaceState(
      window.history.state,
      '',
      `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
    )
    if (auth.isAuthenticated) return
    void startGoogleSignIn(redirectTo)
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    rememberReturnTo,
    startGoogleSignIn,
  ])

  return {
    ...auth,
    error:
      flowError === null
        ? startError
        : flowError.code === 'rejected' && flowError.message
          ? flowError.message
          : OAUTH_ERROR_MESSAGES[flowError.code],
    isSigningIn,
    signInGoogle: async (redirectTo = window.location.href) => {
      rememberReturnTo()
      const handoffUrl = googleSignInHandoffUrl(redirectTo)
      if (handoffUrl) {
        window.location.replace(handoffUrl)
        return
      }
      await startGoogleSignIn(redirectTo)
    },
    signOut,
  }
}
