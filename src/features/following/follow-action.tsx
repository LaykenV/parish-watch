import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  MailIcon,
} from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '../../components/ui/button'
import { Sheet } from '../discovery/sheet'
import type { DeliveryFrequency, FollowTarget } from './contracts'
import { frequencyLabel } from './contracts'

import './following.css'

type FollowStep =
  'choose' | 'email' | 'code' | 'expired' | 'google-failed' | 'success'

export function FollowAction({
  available,
  className,
  label = 'Follow',
  target,
}: {
  available: boolean
  className?: string
  label?: string
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

  const reset = () => {
    setStep('choose')
    setFrequency('immediate')
    setEmail('')
    setCode('')
    setError('')
    setDestination('')
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

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
              onGoogle={() => {
                setDestination('Google account')
                setStep('success')
              }}
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
              onSubmit={() => {
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                  setError('Enter a complete email address.')
                  return
                }
                setDestination(email)
                setStep('code')
              }}
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
              onExpired={() => setStep('expired')}
              onSubmit={() => {
                if (code.length !== 6) {
                  setError('Enter the six-digit code.')
                  return
                }
                setStep('success')
              }}
            />
          ) : null}
          {step === 'expired' ? (
            <ExpiredCode
              onBack={() => setStep('email')}
              onRetry={() => {
                setCode('')
                setError('')
                setStep('code')
              }}
            />
          ) : null}
          {step === 'google-failed' ? (
            <ProviderFailure
              onEmail={() => setStep('email')}
              onRetry={() => setStep('choose')}
            />
          ) : null}
          {step === 'success' ? (
            <FollowSuccess
              destination={destination}
              frequency={frequency}
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
  onEmail,
  onFrequency,
  onGoogle,
  onGoogleFailure,
  target,
}: {
  frequency: DeliveryFrequency
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
        <Button onClick={onGoogle} size="touch">
          Continue with Google
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
  target,
}: {
  email: string
  error: string
  onBack: () => void
  onChange: (value: string) => void
  onSubmit: () => void
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
      <Button size="touch" type="submit">
        Send verification code
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
  onExpired,
  onSubmit,
}: {
  code: string
  email: string
  error: string
  onBack: () => void
  onChange: (value: string) => void
  onExpired: () => void
  onSubmit: () => void
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
      <Button size="touch" type="submit">
        Verify and follow
      </Button>
      <button className="follow-text-action" onClick={onExpired} type="button">
        The code expired
      </button>
    </form>
  )
}

function ExpiredCode({
  onBack,
  onRetry,
}: {
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div className="follow-state-panel" role="alert">
      <CircleAlertIcon aria-hidden="true" />
      <p className="follow-step-label">Verification needed</p>
      <h3>That code expired.</h3>
      <p>No follow was created. Send a new code or use another email.</p>
      <div className="follow-state-actions">
        <Button onClick={onRetry} size="touch">
          Send a new code
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
  onDone,
  target,
}: {
  destination: string
  frequency: DeliveryFrequency
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
