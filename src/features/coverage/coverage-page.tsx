import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleSlash2Icon,
  Clock3Icon,
  FileCheck2Icon,
  PauseCircleIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import type { ComponentType, FormEvent, SVGProps } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { FollowAction } from '../following/follow-action'
import type { CoverageBody, CoverageState } from './contracts'
import { coverageStateDescription } from './contracts'
import type {
  CoveragePageData,
  CoverageRequestPageData,
} from './coverage-page.data'

import './coverage.css'

const COVERAGE_STATES: CoverageState[] = [
  'Supported',
  'Degraded',
  'Validating sources',
  'Paused',
  'Not supported',
]

type StatusPresentation = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  variant: 'success' | 'warning' | 'info' | 'secondary' | 'outline'
}

const STATUS_PRESENTATION: Record<CoverageState, StatusPresentation> = {
  Supported: { icon: CheckCircle2Icon, variant: 'success' },
  Degraded: { icon: CircleAlertIcon, variant: 'warning' },
  'Validating sources': { icon: Clock3Icon, variant: 'info' },
  Paused: { icon: PauseCircleIcon, variant: 'secondary' },
  'Not supported': { icon: CircleSlash2Icon, variant: 'outline' },
}

export function CoveragePage({ data }: { data: CoveragePageData }) {
  const liveRegions = useQuery(api.coverage.publicHealth.regions, data.scenario ? 'skip' : {})
  const regions = data.scenario ? data.regions : liveRegions
  if (!data.available) return <CoverageUnavailable />
  if (!regions) return <main id="resident-main" className="coverage-page"><p role="status">Loading current source health...</p></main>

  const requestSearch = data.scenario ? { fixture: 'new' as const } : {}

  return (
    <main className="coverage-page" id="resident-main">
      <header className="coverage-page-intro">
        <div>
          <h1>Source health, body by body</h1>
          <p>
            Public Parish calls a government body supported only after its
            official sources pass the same evidence and freshness checks.
            Coverage never measures political importance.
          </p>
        </div>
        <div className="coverage-page-actions">
          <Button
            render={<Link search={requestSearch} to="/coverage/request" />}
            size="touch"
          >
            Request coverage
          </Button>
          <Button
            render={<Link to="/how-it-works" />}
            size="touch"
            variant="outline"
          >
            How Public Parish works
          </Button>
        </div>
      </header>

      <section aria-labelledby="coverage-key-title" className="coverage-key">
        <div className="coverage-section-heading">
          <h2 id="coverage-key-title">What the statuses mean</h2>
          <p>Every state has a written definition. Color is secondary.</p>
        </div>
        <ul>
          {COVERAGE_STATES.map((state) => (
            <li key={state}>
              <CoverageStatus state={state} />
              <span>{coverageStateDescription(state)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="coverage-regions">
        {regions.map((region) => (
          <section
            aria-labelledby={`coverage-region-${slugify(region.name)}`}
            className="coverage-region"
            key={region.name}
          >
            <div className="coverage-region-heading">
              <h2 id={`coverage-region-${slugify(region.name)}`}>
                {region.name}
              </h2>
              <span>
                {region.bodies.length}{' '}
                {region.bodies.length === 1
                  ? 'government body'
                  : 'government bodies'}
              </span>
            </div>
            <div className="coverage-body-list">
              {region.bodies.map((body) => (
                <CoverageBodyRow
                  body={body}
                  key={body.id}
                  requestSearch={requestSearch}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="coverage-request-callout">
        <div>
          <h2>Not seeing your parish or city?</h2>
          <p>
            A request records interest. It does not start a crawl, move a place
            ahead of another, or promise a launch date.
          </p>
        </div>
        <Button
          render={<Link search={requestSearch} to="/coverage/request" />}
          size="touch"
          variant="outline"
        >
          Request coverage
        </Button>
      </aside>
    </main>
  )
}

function CoverageBodyRow({
  body,
  requestSearch,
}: {
  body: CoverageBody
  requestSearch: { fixture?: 'new' }
}) {
  return (
    <article
      className="coverage-body"
      data-coverage-state={slugify(body.state)}
    >
      <div className="coverage-body-identity">
        <h3>{body.name}</h3>
        <CoverageStatus state={body.state} />
      </div>

      <dl className="coverage-body-ledger">
        <div>
          <dt>
            <FileCheck2Icon aria-hidden="true" />
            Sources monitored
          </dt>
          <dd>{body.sourceKinds.join(' · ')}</dd>
        </div>
        <div>
          <dt>
            <ShieldCheckIcon aria-hidden="true" />
            Last successful check
          </dt>
          <dd>{body.lastSuccessfulCheck ?? 'No successful check yet'}</dd>
        </div>
        <div>
          <dt>
            <CalendarClockIcon aria-hidden="true" />
            Next expected artifact
          </dt>
          <dd>{body.nextExpectedArtifact ?? 'Not known'}</dd>
        </div>
      </dl>

      <div className="coverage-body-note">
        <p>{body.limitation}</p>
        <div className="coverage-body-actions">
          <Button
            render={<Link hash="coverage-standard" to="/how-it-works" />}
            size="touch"
            variant="link"
          >
            View coverage method
          </Button>
          {body.followAvailable ? (
            <FollowAction
              available
              label="Follow body"
              target={{
                detail: 'Coverage and material decision updates',
                key: body.id,
                kind: 'Government body',
                title: body.name,
              }}
            />
          ) : null}
          {body.state === 'Degraded' ? (
            <Button
              render={
                <Link search={requestSearch} to="/coverage/request" />
              }
              size="touch"
              variant="ghost"
            >
              Request coverage
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function CoverageStatus({ state }: { state: CoverageState }) {
  const presentation = STATUS_PRESENTATION[state]
  const Icon = presentation.icon
  return (
    <Badge
      data-coverage-state={slugify(state)}
      size="lg"
      variant={presentation.variant}
    >
      <Icon aria-hidden="true" />
      {state}
    </Badge>
  )
}

function CoverageUnavailable() {
  return (
    <main className="coverage-page coverage-unavailable" id="resident-main">
      <CircleAlertIcon aria-hidden="true" />
      <div>
        <h1>Coverage status is not connected yet</h1>
        <p>
          Public Parish has accepted Lafayette decision records, but that does
          not prove complete government-body coverage. This page will open when
          public statuses come from the coverage gate itself.
        </p>
        <div className="coverage-page-actions">
          <Button render={<Link to="/explore" />} size="touch">
            Explore published records
          </Button>
          <Button
            render={<Link to="/how-it-works" />}
            size="touch"
            variant="outline"
          >
            Read the method
          </Button>
        </div>
      </div>
    </main>
  )
}

export function CoverageRequestPage({
  data,
}: {
  data: CoverageRequestPageData
}) {
  const recordRequest = useMutation(api.coverage.requests.record)
  const requestNotice = useAction(api.coverage.requests.requestNotice)
  const verifyNotice = useMutation(api.coverage.requests.verifyNotice)
  const requesterRef = useRef('')
  const requesterToken = () => {
    if (!requesterRef.current) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
      try { requesterRef.current = sessionStorage.getItem('pp-coverage-requester') ?? token; sessionStorage.setItem('pp-coverage-requester', requesterRef.current) } catch { requesterRef.current = token }
    }
    return requesterRef.current
  }
  const [placeKind, setPlaceKind] = useState<'parish' | 'municipality' | 'unknown'>('parish')
  const [challengeId, setChallengeId] = useState('')
  const [noticeVerified, setNoticeVerified] = useState(false)
  const [noticeState, setNoticeState] = useState<'sent' | 'stopped'>()
  const [place, setPlace] = useState('')
  const [homepage, setHomepage] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'verify' | 'complete'>('form')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const placeId = useId()
  const codeId = useId()
  const errorId = useId()
  const placeRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const completeHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (step === 'verify') codeRef.current?.focus()
    if (step === 'complete') completeHeadingRef.current?.focus()
  }, [step])

  if (!data.available) return <CoverageRequestUnavailable />

  const completeRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!place.trim()) {
      setError(
        'Name a parish or municipality so Public Parish can record the request.',
      )
      placeRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError('')
    if (!data.scenario) {
      try {
        const saved = await recordRequest({ requesterToken: requesterToken(), placeName: place, placeKind, homepage: homepage.trim() || undefined })
        setStatus('Requested. We validate every source before coverage goes live.')
        if (email.trim()) {
          try {
            const notice = await requestNotice({ requestId: saved.requestId, requesterToken: requesterToken(), email })
            setChallengeId(notice.challengeId)
            setStep('verify')
          } catch { setStatus('Your request is saved. The optional verification email could not be sent. You can request it again later.'); setStep('complete') }
        } else setStep('complete')
      } catch { setError('The request could not be saved. Check the place and homepage, or try again later. Your entries remain here.') }
      finally { setSubmitting(false) }
      return
    }
    window.setTimeout(() => {
      setSubmitting(false)
      if (data.scenario === 'rate-limited') {
        setError(
          'This device has sent several requests. Try again tomorrow. Your place stays in the form.',
        )
        return
      }
      setStatus(
        'Requested. We validate every source before coverage goes live.',
      )
      setStep(email.trim() ? 'verify' : 'complete')
    }, 450)
  }

  return (
    <main className="coverage-request-page" id="resident-main">
      <Link className="coverage-back-link" to="/coverage">
        Back to coverage
      </Link>

      <div className="coverage-request-layout">
        <header>
          <h1>Request coverage</h1>
          <p>
            Tell Public Parish which Louisiana parish or municipality you want
            checked. A request records interest. It does not start source work
            or promise a date.
          </p>
        </header>

        <aside className="coverage-request-assurance">
          <ShieldCheckIcon aria-hidden="true" />
          <div>
            <h2>One gate for every place</h2>
            <p>
              Public Parish validates official domains, source history,
              citations, freshness, and direct links before calling a body
              supported.
            </p>
          </div>
        </aside>

        {step === 'form' ? (
          <form className="coverage-request-form" onSubmit={completeRequest}>
            <label className="coverage-field"><span>Place type</span><select value={placeKind} onChange={event => setPlaceKind(event.target.value as typeof placeKind)}><option value="parish">Parish</option><option value="municipality">Municipality</option><option value="unknown">Not sure</option></select></label>
            <label className="coverage-field" htmlFor={placeId}>
              <span>Parish or municipality</span>
              <input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                autoComplete="address-level2"
                id={placeId}
                onChange={(event) => {
                  setPlace(event.target.value)
                  if (error) setError('')
                }}
                placeholder="For example, St. Landry Parish"
                ref={placeRef}
                value={place}
              />
            </label>
            <label className="coverage-field">
              <span>Official government homepage, if you know it</span>
              <input
                inputMode="url"
                onChange={(event) => setHomepage(event.target.value)}
                placeholder="https://"
                type="url"
                value={homepage}
              />
            </label>
            <label className="coverage-field">
              <span>Email for a launch notice, optional</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>
            <p className="coverage-field-note">
              The request is recorded before email verification. If verification
              fails, only the launch notice is removed.
            </p>
            <div aria-live="polite" className="coverage-request-submit">
              <Button loading={submitting} size="touch" type="submit">
                Request coverage
              </Button>
              <p className={error ? 'coverage-form-error' : ''} id={errorId}>
                {error || 'No account or street address is needed.'}
              </p>
            </div>
          </form>
        ) : null}

        {step === 'verify' ? (
          <section
            aria-labelledby="coverage-verify-title"
            className="coverage-verify"
          >
            <CheckCircle2Icon aria-hidden="true" />
            <div>
              <p className="coverage-confirmation" role="status">
                {status}
              </p>
              <h2 id="coverage-verify-title">
                Verify the optional launch notice
              </h2>
              <p>
                Enter the six-digit code sent to <strong>{email}</strong>. This
                verifies one notice address. It does not create an account.
              </p>
              <label className="coverage-field" htmlFor={codeId}>
                <span>Six-digit code</span>
                <input
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={error ? true : undefined}
                  autoComplete="one-time-code"
                  id={codeId}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    if (error) setError('')
                  }}
                  ref={codeRef}
                  value={code}
                />
              </label>
              <div aria-live="polite" className="coverage-request-submit">
                <Button
                  disabled={submitting}
                  onClick={async () => {
                    if (code.length !== 6) {
                      setError('Enter the complete six-digit code.')
                      codeRef.current?.focus()
                      return
                    }
                    if (data.scenario === 'notice-failure') {
                      setError(
                        'The request is saved, but the launch notice could not be verified. Try another code or finish without email.',
                      )
                      return
                    }
                    if (!data.scenario) {
                      setSubmitting(true)
                      try {
                        const result = await verifyNotice({ challengeId, code, requesterToken: requesterToken() })
                        if (!result.verified) { setError('This code is incorrect, expired, or has too many attempts. Your coverage request is still saved.'); return }
                        setNoticeState(result.noticeState)
                      } catch { setError('Verification is unavailable. Your request is still saved.'); return }
                      finally { setSubmitting(false) }
                    }
                    setNoticeVerified(true)
                    setError('')
                    setStep('complete')
                  }}
                  size="touch"
                >
                  Verify launch notice
                </Button>
                <Button
                  onClick={() => {
                    setEmail('')
                    setError('')
                    setStep('complete')
                  }}
                  size="touch"
                  variant="ghost"
                >
                  Finish without email
                </Button>
                <p className={error ? 'coverage-form-error' : ''} id={errorId}>
                  {error}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {step === 'complete' ? (
          <section className="coverage-request-complete">
            <CheckCircle2Icon aria-hidden="true" />
            <div>
              <h2 ref={completeHeadingRef} tabIndex={-1}>
                Request recorded
              </h2>
              <p>{status}</p>
              {data.scenario === 'duplicate' ? (
                <p>
                  The same confirmation appears for a repeated request. Public
                  demand counts and other requesters remain private.
                </p>
              ) : null}
              {noticeVerified && email ? <p>{noticeState === 'sent' ? 'Your email is verified. The one launch notice for this place was already sent and will not be sent again.' : noticeState === 'stopped' ? 'Your email is verified, but the prior launch notice was stopped. No new notice will be sent. You can check current support on Coverage.' : `A launch notice is verified for ${email}.`}</p> : null}
              <Button
                render={
                  <Link
                    search={data.scenario ? { fixture: 'preview' } : {}}
                    to="/coverage"
                  />
                }
                size="touch"
                variant="outline"
              >
                Return to coverage
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function CoverageRequestUnavailable() {
  return (
    <main
      className="coverage-request-page coverage-request-unavailable"
      id="resident-main"
    >
      <CircleAlertIcon aria-hidden="true" />
      <div>
        <h1>Coverage requests are not available yet</h1>
        <p>
          The form will open after demand recording, deduplication, rate limits,
          and optional email verification pass their production checks.
        </p>
        <Button
          render={<Link to="/coverage" />}
          size="touch"
          variant="outline"
        >
          Return to coverage
        </Button>
      </div>
    </main>
  )
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
