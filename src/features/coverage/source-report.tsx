import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LockKeyholeIcon,
} from 'lucide-react'
import { useId, useRef, useState } from 'react'

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
  const [error, setError] = useState('')
  const [result, setResult] = useState<'idle' | 'sent'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const descriptionId = useId()
  const errorId = useId()
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const reset = () => {
    setDescription('')
    setError('')
    setResult('idle')
    setSubmitting(false)
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
      {!available ? (
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
            <Button onClick={() => handleOpenChange(false)} size="touch">
              Return to the record
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="source-report-form"
          onSubmit={(event) => {
            event.preventDefault()
            const value = description.trim()
            if (!value) {
              setError(
                'Describe what does not match so the source can be checked.',
              )
              descriptionRef.current?.focus()
              return
            }

            setSubmitting(true)
            setError('')
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
            <select defaultValue="wrong-fact">
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
            <input inputMode="url" placeholder="https://" type="url" />
          </label>

          <label className="source-report-field">
            <span>Your email, only if you want a reply</span>
            <input
              autoComplete="email"
              placeholder="you@example.com"
              type="email"
            />
          </label>

          <div className="source-report-attached">
            <span>Public Parish page attached</span>
            <code>{recordUrl}</code>
          </div>

          <div aria-live="polite" className="source-report-form-footer">
            <Button loading={submitting} size="touch" type="submit">
              Send report privately
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
