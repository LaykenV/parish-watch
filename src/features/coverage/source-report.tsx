import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LockKeyholeIcon,
} from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useId, useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { Button } from '../../components/ui/button'
import { Sheet } from '../discovery/sheet'

import './source-report.css'

export type SourceReportScenario = 'ready' | 'provider-failure'

export function SourceProblemReport({
  available,
  recordUrl,
  scenario = 'ready',
}: {
  available: boolean
  recordUrl: string
  scenario?: SourceReportScenario
}) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] =
    useState<SourceReportCategory>('wrong-fact')
  const [officialUrl, setOfficialUrl] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<'idle' | 'sent'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [browserToken, setBrowserToken] = useState('')
  const availability = useQuery(api.sourceReports.reports.availability, {})
  const submitReport = useMutation(api.sourceReports.reports.submit)
  const receipt = useQuery(
    api.sourceReports.reports.receipt,
    submissionId && browserToken ? { submissionId, browserToken } : 'skip',
  )
  const simulated = import.meta.env.DEV && available
  const checkingAvailability = !simulated && availability === undefined
  const connected = simulated || availability?.available === true
  const descriptionId = useId()
  const errorId = useId()
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const returnActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result === 'sent') returnActionRef.current?.focus()
  }, [result])

  useEffect(() => {
    setBrowserToken(readBrowserToken())
  }, [])

  useEffect(() => {
    if (!receipt?.found) return
    if (receipt.status === 'sent') {
      setSubmitting(false)
      setResult('sent')
    } else if (receipt.status === 'failed') {
      setSubmitting(false)
      setSubmissionId(null)
      setError(
        'The private report was not sent. Your description is still here. Try again in a moment.',
      )
    }
  }, [receipt])

  useEffect(() => {
    if (!submissionId || !submitting) return
    const timeoutId = window.setTimeout(() => {
      setSubmitting(false)
      setError(
        'Delivery is taking longer than expected. Your report may still send. Check again in a moment.',
      )
    }, REPORT_CONFIRMATION_TIMEOUT_MS)
    return () => window.clearTimeout(timeoutId)
  }, [submissionId, submitting])

  const reset = () => {
    setDescription('')
    setCategory('wrong-fact')
    setOfficialUrl('')
    setReplyEmail('')
    setError('')
    setResult('idle')
    setSubmitting(false)
    setSubmissionId(null)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  return (
    <Sheet
      className="source-report-sheet"
      description="This goes to Public Parish privately. It does not open a public thread or start automatic reprocessing."
      onOpenChange={handleOpenChange}
      open={open}
      size="full"
      title="Report a source problem"
      trigger={(props) => (
        <Button {...props} size="touch" variant="ghost">
          Report a source problem
        </Button>
      )}
    >
      {checkingAvailability ? (
        <div
          aria-busy="true"
          className="source-report-unavailable"
          role="status"
        >
          <LockKeyholeIcon aria-hidden="true" />
          <div>
            <h2>Checking private reporting</h2>
            <p>Confirming the private delivery path before opening the form.</p>
          </div>
        </div>
      ) : !connected ? (
        <div className="source-report-unavailable" role="status">
          <CircleAlertIcon aria-hidden="true" />
          <div>
            <h2>Private reporting is not connected yet</h2>
            <p>
              The form will open after its private AgentMail delivery path can
              prove receipt without exposing resident messages.
            </p>
          </div>
        </div>
      ) : result === 'sent' ? (
        <div className="source-report-confirmation" role="status">
          <CheckCircle2Icon aria-hidden="true" />
          <div>
            <h2>Report sent privately</h2>
            <p>
              Public Parish will not change this page unless validated official
              evidence supports the correction.
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              ref={returnActionRef}
              size="touch"
            >
              Return to the record
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="source-report-form"
          onSubmit={async (event) => {
            event.preventDefault()
            const value = description.trim()
            if (value.length < 10 || value.length > 2_000) {
              setError(
                'Describe what does not match in 10 to 2,000 characters.',
              )
              descriptionRef.current?.focus()
              return
            }

            setSubmitting(true)
            setError('')
            if (simulated) {
              window.setTimeout(() => {
                setSubmitting(false)
                if (scenario === 'provider-failure') {
                  setError(
                    'The private report was not sent. Your description is still here. Try again in a moment.',
                  )
                  return
                }
                setResult('sent')
              }, 450)
              return
            }
            if (!browserToken) {
              setSubmitting(false)
              setError('Private reporting is still connecting. Try again.')
              return
            }
            if (submissionId) {
              setSubmitting(true)
              setError('')
              return
            }
            const nextSubmissionId = crypto.randomUUID()
            setSubmissionId(nextSubmissionId)
            try {
              const response = await submitReport({
                submissionId: nextSubmissionId,
                browserToken,
                category,
                recordUrl,
                description: value,
                officialUrl: officialUrl.trim() || undefined,
                replyEmail: replyEmail.trim() || undefined,
              })
              if (response.status === 'sent') {
                setSubmitting(false)
                setResult('sent')
              }
            } catch (submitError) {
              setSubmitting(false)
              setSubmissionId(null)
              setError(sourceReportErrorMessage(submitError))
            }
          }}
        >
          <div className="source-report-private-note">
            <LockKeyholeIcon aria-hidden="true" />
            <p>
              Sent privately. The report is never published as a comment or
              correction thread.
            </p>
          </div>

          <label className="source-report-field">
            <span>Problem type</span>
            <select
              disabled={Boolean(submissionId)}
              onChange={(event) =>
                setCategory(event.target.value as SourceReportCategory)
              }
              value={category}
            >
              <option value="wrong-fact">
                A fact does not match the source
              </option>
              <option value="broken-citation">
                A Source opens the wrong excerpt
              </option>
              <option value="missing-document">
                A newer official document is missing
              </option>
              <option value="wrong-record">
                This record belongs to another issue
              </option>
              <option value="importance-factor">
                A why-it-matters reason is unsupported
              </option>
            </select>
          </label>

          <label className="source-report-field" htmlFor={descriptionId}>
            <span>What did you find?</span>
            <textarea
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              id={descriptionId}
              disabled={Boolean(submissionId)}
              onChange={(event) => {
                setDescription(event.target.value)
                if (error) setError('')
              }}
              placeholder="Name the fact, Source, or newer official record that needs review."
              ref={descriptionRef}
              rows={5}
              value={description}
            />
          </label>

          <label className="source-report-field">
            <span>Official document link, if you have one</span>
            <input
              disabled={Boolean(submissionId)}
              inputMode="url"
              onChange={(event) => setOfficialUrl(event.target.value)}
              placeholder="https://"
              type="url"
              value={officialUrl}
            />
          </label>

          <label className="source-report-field">
            <span>Your email, only if you want a reply</span>
            <input
              autoComplete="email"
              disabled={Boolean(submissionId)}
              onChange={(event) => setReplyEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={replyEmail}
            />
          </label>

          <div className="source-report-attached">
            <span>Public Parish page attached</span>
            <code>{recordUrl}</code>
          </div>

          <div aria-live="polite" className="source-report-form-footer">
            <Button loading={submitting} size="touch" type="submit">
              {submissionId
                ? 'Check delivery again'
                : 'Send report privately'}
            </Button>
            <p className={error ? 'source-report-error' : ''} id={errorId}>
              {error || 'No account or street address is needed.'}
            </p>
          </div>
        </form>
      )}
    </Sheet>
  )
}

type SourceReportCategory =
  | 'wrong-fact'
  | 'broken-citation'
  | 'missing-document'
  | 'wrong-record'
  | 'importance-factor'

const SOURCE_REPORT_BROWSER_TOKEN = 'public-parish-source-report-browser-v1'
const REPORT_CONFIRMATION_TIMEOUT_MS = 45_000

function readBrowserToken(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) return ''
  const existing = window.sessionStorage.getItem(SOURCE_REPORT_BROWSER_TOKEN)
  if (existing) return existing
  const created = `${crypto.randomUUID()}${crypto.randomUUID()}`
  window.sessionStorage.setItem(SOURCE_REPORT_BROWSER_TOKEN, created)
  return created
}

function sourceReportErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message
  }
  return 'The private report was not sent. Your description is still here. Try again in a moment.'
}
