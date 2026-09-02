import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  MailIcon,
} from 'lucide-react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { Button } from '../../components/ui/button'
import { useGoogleAuth } from '../auth/google-auth'
import { Sheet } from '../discovery/sheet'
import type { DeliveryFrequency, FollowTarget } from './contracts'
import { frequencyLabel } from './contracts'
import {
  clearGoogleFollowIntent,
  followTargetKind,
  googleFollowIntentUrl,
  readGoogleFollowIntent,
} from './google-follow-intent'

import './following.css'

type FollowStep =
  | 'choose'
  | 'email'
  | 'code'
  | 'expired'
  | 'exhausted'
  | 'google-failed'
  | 'success'

export function FollowAction({
  available,
  className,
  label = 'Follow',
  live = false,
  target,
}: {
  available: boolean
  className?: string
  label?: string
  live?: boolean
  target: FollowTarget
}) {
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<FollowStep>('choose')
  const [frequency, setFrequency] = useState<DeliveryFrequency>('immediate')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [destination, setDestination] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [managementToken, setManagementToken] = useState<string | null>(null)
  const [requestingCode, setRequestingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [savingGoogleFollow, setSavingGoogleFollow] = useState(false)
  const googleIntentHandled = useRef(false)
  const auth = useGoogleAuth()
  const requestEmailFollow = useAction(
    api.follows.enrollment.requestEmailFollow,
  )
  const verifyEmailFollow = useAction(api.follows.enrollment.verifyEmailFollow)
  const createGoogleFollow = useMutation(
    api.follows.enrollment.createGoogleFollow,
  )
  const notificationSettings = useQuery(
    api.follows.enrollment.currentNotificationSettings,
    live && auth.isAuthenticated ? {} : 'skip',
  )
  const delivery = useQuery(
    api.follows.enrollment.verificationDelivery,
    live && challengeId ? { challengeId } : 'skip',
  )

  const reset = () => {
    setStep('choose')
    setFrequency(notificationSettings?.defaultCadence ?? 'immediate')
    setEmail('')
    setCode('')
    setError('')
    setDestination('')
    setChallengeId(null)
    setExpiresAt(null)
    setManagementToken(null)
    setRequestingCode(false)
    setVerifyingCode(false)
    setSavingGoogleFollow(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const saveGoogleFollow = useCallback(
    async (cadence: DeliveryFrequency) => {
      setSavingGoogleFollow(true)
      setError('')
      try {
        await createGoogleFollow({
          cadence,
          targetKey: target.key,
          targetKind: followTargetKind(target.kind),
        })
        setDestination('Google account')
        setStep('success')
      } catch {
        setStep('google-failed')
      } finally {
        setSavingGoogleFollow(false)
      }
    },
    [createGoogleFollow, target.key, target.kind],
  )

  const startGoogleFollow = async () => {
    if (!live) {
      setDestination('Google account')
      setStep('success')
      return
    }
    if (auth.isAuthenticated) {
      await saveGoogleFollow(frequency)
      return
    }
    const redirectTo = googleFollowIntentUrl(
      window.location.href,
      target,
      frequency,
    )
    await auth.signInGoogle(redirectTo)
  }

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a complete email address.')
      return
    }
    if (!live) {
      setDestination(email)
      setStep('code')
      return
    }
    setRequestingCode(true)
    setError('')
    try {
      const result = await requestEmailFollow({
        email,
        targetKind: followTargetKind(target.kind),
        targetKey: target.key,
        cadence: frequency,
      })
      setChallengeId(result.challengeId)
      setExpiresAt(result.expiresAt)
      setCode('')
      setDestination(email)
      setStep('code')
    } catch {
      setError('The verification email could not be started. Try again.')
      setStep('email')
    } finally {
      setRequestingCode(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('Enter the six-digit code.')
      return
    }
    if (!live || !challengeId) {
      setStep('success')
      return
    }
    setVerifyingCode(true)
    setError('')
    try {
      const result = await verifyEmailFollow({ challengeId, code })
      if (result.status === 'verified') {
        setManagementToken(result.managementToken)
        setStep('success')
      } else if (result.status === 'wrong') {
        setError(
          `That code does not match. ${result.attemptsRemaining} ${result.attemptsRemaining === 1 ? 'try' : 'tries'} left.`,
        )
      } else if (result.status === 'exhausted') {
        setStep('exhausted')
      } else if (result.status === 'expired') {
        setStep('expired')
      } else {
        setError('That verification request is no longer available.')
      }
    } catch {
      setError('Public Parish could not verify that code. Try again.')
    } finally {
      setVerifyingCode(false)
    }
  }

  useEffect(() => {
    if (notificationSettings && step === 'choose') {
      setFrequency(notificationSettings.defaultCadence)
    }
  }, [notificationSettings, step])

  useEffect(() => {
    if (!live || auth.isLoading || googleIntentHandled.current) return
    const intent = readGoogleFollowIntent(window.location.href)
    if (
      !intent ||
      intent.targetKind !== followTargetKind(target.kind) ||
      intent.targetKey !== target.key
    ) {
      return
    }
    setOpen(true)
    setFrequency(intent.cadence)
    if (!auth.isAuthenticated && !auth.error) return
    googleIntentHandled.current = true
    window.history.replaceState(
      window.history.state,
      '',
      clearGoogleFollowIntent(window.location.href),
    )
    if (auth.error) {
      setStep('google-failed')
      return
    }
    void saveGoogleFollow(intent.cadence)
  }, [
    auth.error,
    auth.isAuthenticated,
    auth.isLoading,
    live,
    saveGoogleFollow,
    target.key,
    target.kind,
  ])

  useEffect(() => {
    if (step !== 'code' || !expiresAt) return
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      setStep('expired')
      return
    }
    const timer = window.setTimeout(() => setStep('expired'), remaining)
    return () => window.clearTimeout(timer)
  }, [expiresAt, step])

  return (
    <Sheet
      className="follow-sheet"
      description={
        available
          ? 'Choose when to hear from Public Parish, then choose where the update should go.'
          : 'The resident follow interface is ready, but delivery is not connected yet.'
      }
      onOpenChange={handleOpenChange}
      open={open}
      size="tall"
      title={
        available
          ? `Get updates about this ${target.kind.toLowerCase()}`
          : 'Updates are not available yet'
      }
      trigger={(props) => (
        <Button {...props} className={className} size="touch" variant="outline">
          {label}
        </Button>
      )}
    >
      {available ? (
        <div aria-labelledby={titleId} className="follow-flow">
          <h2 className="visually-hidden" id={titleId}>
            Follow {target.title}
          </h2>
          {step === 'choose' ? (
            <FollowChoice
              frequency={frequency}
              onEmail={() => setStep('email')}
              onFrequency={setFrequency}
              googleBusy={auth.isSigningIn || savingGoogleFollow}
              onGoogle={() => void startGoogleFollow()}
              onGoogleFailure={() => setStep('google-failed')}
              target={target}
            />
          ) : null}
          {step === 'email' ? (
            <EmailEntry
              email={email}
              error={error}
              onBack={() => {
                setError('')
                setStep('choose')
              }}
              onChange={(value) => {
                setEmail(value)
                setError('')
              }}
              onSubmit={() => void sendCode()}
              submitting={requestingCode}
              target={target}
            />
          ) : null}
          {step === 'code' ? (
            <CodeEntry
              code={code}
              email={email}
              error={error}
              onBack={() => {
                setCode('')
                setError('')
                setStep('email')
              }}
              onChange={(value) => {
                setCode(value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              deliveryStatus={delivery?.status}
              onResend={() => void sendCode()}
              onSubmit={() => void verifyCode()}
              resending={requestingCode}
              verifying={verifyingCode}
            />
          ) : null}
          {step === 'expired' ? (
            <ExpiredCode
              onBack={() => setStep('email')}
              onRetry={() => void sendCode()}
              sending={requestingCode}
            />
          ) : null}
          {step === 'exhausted' ? (
            <ExpiredCode
              exhausted
              onBack={() => setStep('email')}
              onRetry={() => void sendCode()}
              sending={requestingCode}
            />
          ) : null}
          {step === 'google-failed' ? (
            <ProviderFailure
              onEmail={() => setStep('email')}
              onRetry={() => void startGoogleFollow()}
            />
          ) : null}
          {step === 'success' ? (
            <FollowSuccess
              destination={destination}
              frequency={frequency}
              managementToken={managementToken}
              onDone={() => handleOpenChange(false)}
              target={target}
            />
          ) : null}
        </div>
      ) : (
        <div className="follow-unavailable">
          <CircleAlertIcon aria-hidden="true" />
          <div>
            <p className="follow-unavailable-title">
              Reading and official sources still work.
            </p>
            <p>
              Public Parish will offer Google-managed follows and verified
              email-only alerts after both delivery paths pass their checks.
            </p>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function FollowChoice({
  frequency,
  googleBusy,
  onEmail,
  onFrequency,
  onGoogle,
  onGoogleFailure,
  target,
}: {
  frequency: DeliveryFrequency
  googleBusy: boolean
  onEmail: () => void
  onFrequency: (value: DeliveryFrequency) => void
  onGoogle: () => void
  onGoogleFailure: () => void
  target: FollowTarget
}) {
  return (
    <>
      <DeliveryReceipt
        destination="Choose Google or email"
        frequency={frequency}
        target={target}
      />
      <fieldset className="follow-fieldset">
        <legend>Send me</legend>
        <FrequencyOptions onChange={onFrequency} value={frequency} />
      </fieldset>
      <div className="follow-provider-grid">
        <Button disabled={googleBusy} onClick={onGoogle} size="touch">
          {googleBusy ? 'Saving follow...' : 'Continue with Google'}
        </Button>
        <Button onClick={onEmail} size="touch" variant="outline">
          <MailIcon aria-hidden="true" />
          Use email only
        </Button>
      </div>
      <p className="follow-provider-note">
        Both choices send the same updates. Email-only creates an alert
        subscription, not an account.
      </p>
      {import.meta.env.DEV ? (
        <button
          className="follow-fixture-link"
          onClick={onGoogleFailure}
          type="button"
        >
          Preview Google sign-in failure
        </button>
      ) : null}
    </>
  )
}

function EmailEntry({
  email,
  error,
  onBack,
  onChange,
  onSubmit,
  submitting,
  target,
}: {
  email: string
  error: string
  onBack: () => void
  onChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  target: FollowTarget
}) {
  return (
    <form
      className="follow-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <BackButton onClick={onBack}>Change delivery choice</BackButton>
      <div>
        <p className="follow-step-label">Email-only alert</p>
        <h3>Where should updates go?</h3>
        <p className="follow-step-copy">
          Public Parish will send a short-lived code before following{' '}
          <strong>{target.title}</strong>.
        </p>
      </div>
      <label className="follow-input-label" htmlFor="follow-email">
        Email address
      </label>
      <input
        aria-describedby={error ? 'follow-email-error' : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="email"
        className="follow-input"
        id="follow-email"
        inputMode="email"
        onChange={(event) => onChange(event.target.value)}
        placeholder="you@example.com"
        type="email"
        value={email}
      />
      {error ? (
        <p className="follow-field-error" id="follow-email-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={submitting} size="touch" type="submit">
        {submitting ? 'Sending code...' : 'Send verification code'}
      </Button>
      <p className="follow-provider-note">
        This creates an alert subscription, not an account.
      </p>
    </form>
  )
}

function CodeEntry({
  code,
  email,
  error,
  onBack,
  onChange,
  deliveryStatus,
  onResend,
  onSubmit,
  resending,
  verifying,
}: {
  code: string
  email: string
  error: string
  onBack: () => void
  onChange: (value: string) => void
  deliveryStatus?: 'failed' | 'pending' | 'sent' | 'unavailable'
  onResend: () => void
  onSubmit: () => void
  resending: boolean
  verifying: boolean
}) {
  return (
    <form
      className="follow-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <BackButton onClick={onBack}>Change email</BackButton>
      <div>
        <p className="follow-step-label">Verification needed</p>
        <h3>Enter the code sent to {email}</h3>
        <p className="follow-step-copy">
          The code expires in 10 minutes. You can try three times.
        </p>
      </div>
      {deliveryStatus === 'pending' ? (
        <p aria-live="polite" className="follow-provider-note" role="status">
          AgentMail is sending the code now.
        </p>
      ) : null}
      {deliveryStatus === 'failed' || deliveryStatus === 'unavailable' ? (
        <p className="follow-field-error" role="alert">
          That message could not be delivered. Send a new code to try again.
        </p>
      ) : null}
      <label className="follow-input-label" htmlFor="follow-code">
        Six-digit code
      </label>
      <input
        aria-describedby={error ? 'follow-code-error' : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="one-time-code"
        className="follow-input follow-code-input"
        id="follow-code"
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        pattern="[0-9]{6}"
        placeholder="000000"
        value={code}
      />
      {error ? (
        <p className="follow-field-error" id="follow-code-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={verifying} size="touch" type="submit">
        {verifying ? 'Verifying...' : 'Verify and follow'}
      </Button>
      <button
        className="follow-text-action"
        disabled={resending}
        onClick={onResend}
        type="button"
      >
        {resending ? 'Sending a new code...' : 'Send a new code'}
      </button>
    </form>
  )
}

function ExpiredCode({
  exhausted = false,
  onBack,
  onRetry,
  sending,
}: {
  exhausted?: boolean
  onBack: () => void
  onRetry: () => void
  sending: boolean
}) {
  return (
    <div className="follow-state-panel" role="alert">
      <CircleAlertIcon aria-hidden="true" />
      <p className="follow-step-label">Verification needed</p>
      <h3>
        {exhausted ? 'That code cannot be tried again.' : 'That code expired.'}
      </h3>
      <p>No follow was created. Send a new code or use another email.</p>
      <div className="follow-state-actions">
        <Button disabled={sending} onClick={onRetry} size="touch">
          {sending ? 'Sending...' : 'Send a new code'}
        </Button>
        <Button onClick={onBack} size="touch" variant="outline">
          Use another email
        </Button>
      </div>
    </div>
  )
}

function ProviderFailure({
  onEmail,
  onRetry,
}: {
  onEmail: () => void
  onRetry: () => void
}) {
  return (
    <div className="follow-state-panel" role="alert">
      <CircleAlertIcon aria-hidden="true" />
      <p className="follow-step-label">Google sign-in did not finish</p>
      <h3>Your follow was not created.</h3>
      <p>Try Google again or use email only. Your delivery choice is saved.</p>
      <div className="follow-state-actions">
        <Button onClick={onRetry} size="touch">
          Try Google again
        </Button>
        <Button onClick={onEmail} size="touch" variant="outline">
          Use email only
        </Button>
      </div>
    </div>
  )
}

function FollowSuccess({
  destination,
  frequency,
  managementToken,
  onDone,
  target,
}: {
  destination: string
  frequency: DeliveryFrequency
  managementToken?: string | null
  onDone: () => void
  target: FollowTarget
}) {
  return (
    <div aria-live="polite" className="follow-success">
      <span className="follow-success-mark">
        <CheckIcon aria-hidden="true" />
      </span>
      <p className="follow-step-label">Following</p>
      <h3>You will get updates about {target.title}.</h3>
      <DeliveryReceipt
        destination={destination}
        frequency={frequency}
        target={target}
      />
      <p>
        Public Parish sends an alert only when validated official evidence
        changes this target.
      </p>
      <Button onClick={onDone} size="touch">
        Return to {target.kind.toLowerCase()}
      </Button>
      {managementToken ? (
        <Button
          render={
            <a href={`/email/manage/${encodeURIComponent(managementToken)}`} />
          }
          size="touch"
          variant="outline"
        >
          Manage this email follow
        </Button>
      ) : null}
    </div>
  )
}

export function DeliveryReceipt({
  destination,
  frequency,
  target,
}: {
  destination: string
  frequency: DeliveryFrequency
  target: FollowTarget
}) {
  return (
    <dl className="follow-receipt">
      <div>
        <dt>Target</dt>
        <dd>
          <strong>{target.title}</strong>
          <span>{target.detail}</span>
        </dd>
      </div>
      <div>
        <dt>Cadence</dt>
        <dd>{frequencyLabel(frequency)}</dd>
      </div>
      <div>
        <dt>Destination</dt>
        <dd>{destination}</dd>
      </div>
    </dl>
  )
}

export function FrequencyOptions({
  onChange,
  value,
}: {
  onChange: (value: DeliveryFrequency) => void
  value: DeliveryFrequency
}) {
  const groupName = useId()
  const options: { detail: string; label: string; value: DeliveryFrequency }[] =
    [
      {
        value: 'immediate',
        label: 'Immediate material updates',
        detail: 'Outcome, deadline, or material official change',
      },
      {
        value: 'weekly',
        label: 'Weekly roundup',
        detail: 'One email only when followed targets changed',
      },
      {
        value: 'both',
        label: 'Both',
        detail: 'Immediate updates plus the weekly summary',
      },
    ]

  return (
    <div className="follow-frequency-options">
      {options.map((option) => (
        <label
          data-selected={value === option.value ? '' : undefined}
          key={option.value}
        >
          <input
            checked={value === option.value}
            name={groupName}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span>
            <strong>{option.label}</strong>
            <small>{option.detail}</small>
          </span>
        </label>
      ))}
    </div>
  )
}

function BackButton({
  children,
  onClick,
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button className="follow-back" onClick={onClick} type="button">
      <ArrowLeftIcon aria-hidden="true" />
      {children}
    </button>
  )
}
