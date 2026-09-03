import {
  BanIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  ExternalLinkIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '../../components/ui/button'
import { useGoogleAuth } from '../auth/google-auth'

import './coverage-operations.css'

type RunId = Id<'coverageCompilerRuns'>

const TERMINAL_STATES = new Set([
  'succeeded',
  'failed_retryable',
  'failed_terminal',
  'canceled',
  'superseded',
])

export function CoverageOperationsPage() {
  const auth = useGoogleAuth('/operations/coverage')
  const currentUser = useQuery(
    api.auth.currentUser,
    auth.isAuthenticated ? {} : 'skip',
  )

  if (auth.isLoading || (auth.isAuthenticated && currentUser === undefined)) {
    return (
      <OperationsState
        title="Checking owner access"
        detail="Reading this Google session."
      />
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <OperationsState
        title="Owner sign-in required"
        detail="Coverage runs can spend provider credits and change coverage state. Only the configured owner can operate them."
        action={
          <Button
            loading={auth.isSigningIn}
            onClick={() => void auth.signInGoogle('/operations/coverage')}
            size="touch"
          >
            Continue with Google
          </Button>
        }
        error={auth.error}
      />
    )
  }

  if (!currentUser?.isOwner) {
    return (
      <OperationsState
        title="This account is not the owner"
        detail="The route is private even though its address is reachable. Sign in with the account configured for owner operations."
        action={
          <Button
            onClick={() => void auth.signOut()}
            size="touch"
            variant="outline"
          >
            Sign out
          </Button>
        }
      />
    )
  }

  return <OwnerCoverageOperations />
}

function OwnerCoverageOperations() {
  const roots = useQuery(api.coverage.operations.availableRoots, {})
  const runs = useQuery(api.coverage.operations.recentRuns, {})
  const startRun = useMutation(api.coverage.operations.start)
  const cancelRun = useMutation(api.coverage.operations.cancel)
  const retryRun = useMutation(api.coverage.operations.retry)
  const [selectedRunId, setSelectedRunId] = useState<RunId | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (selectedRunId === null && runs?.[0]) setSelectedRunId(runs[0].runId)
  }, [runs, selectedRunId])

  const selectedRun = useQuery(
    api.coverage.operations.run,
    selectedRunId === null ? 'skip' : { runId: selectedRunId },
  )
  const rootNames = useMemo(
    () => new Map(roots?.map((root) => [root.bodyKey, root.bodyName]) ?? []),
    [roots],
  )

  async function operate(
    key: string,
    task: () => Promise<unknown>,
    success: string,
  ) {
    setPendingKey(key)
    setMessage(null)
    try {
      await task()
      setMessage(success)
    } catch (error) {
      setMessage(operationError(error))
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <main className="coverage-ops" id="resident-main">
      <header className="coverage-ops-head">
        <div>
          <p className="coverage-ops-kicker">Private owner operation</p>
          <h1>Coverage compiler</h1>
          <p className="coverage-ops-lede">
            Start with a checked government root. Every redirect, retry, and
            stop stays in the run record before discovery can spend a provider
            credit.
          </p>
        </div>
        <div className="coverage-ops-trust">
          <ShieldCheckIcon aria-hidden="true" />
          <span>Owner checked</span>
          <strong>{roots?.length ?? 0} roots</strong>
        </div>
      </header>

      <p aria-live="polite" className="coverage-ops-announcement" role="status">
        {message}
      </p>

      <section aria-labelledby="root-heading" className="coverage-ops-roots">
        <div className="coverage-ops-section-head">
          <div>
            <p className="coverage-ops-step">Step 1</p>
            <h2 id="root-heading">Choose a checked root</h2>
          </div>
          <p>
            The run receives the version in code. It never accepts a typed URL.
          </p>
        </div>
        {roots === undefined ? (
          <p className="coverage-ops-empty">Loading checked roots.</p>
        ) : (
          <div className="coverage-ops-root-grid">
            {roots.map((root) => {
              const pending = pendingKey === `start:${root.bodyKey}`
              return (
                <article className="coverage-ops-root" key={root.bodyKey}>
                  <div>
                    <p>{root.jurisdictionName}</p>
                    <h3>{root.bodyName}</h3>
                    <a
                      href={root.approvedRootUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open root <ExternalLinkIcon aria-hidden="true" />
                    </a>
                  </div>
                  <div className="coverage-ops-root-action">
                    <span>Manifest {root.version}</span>
                    <Button
                      loading={pending}
                      onClick={() =>
                        void operate(
                          `start:${root.bodyKey}`,
                          async () => {
                            const result = await startRun({
                              bodyKey: root.bodyKey,
                              rootManifestVersion: root.version,
                            })
                            setSelectedRunId(result.runId)
                          },
                          `${root.bodyName} run started or reused.`,
                        )
                      }
                      size="sm"
                    >
                      Start run
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="ledger-heading" className="coverage-ops-ledger">
        <div className="coverage-ops-section-head">
          <div>
            <p className="coverage-ops-step">Step 2</p>
            <h2 id="ledger-heading">Read the run ledger</h2>
          </div>
          <p>Updates arrive from Convex as each stage changes.</p>
        </div>

        <div className="coverage-ops-ledger-grid">
          <div
            aria-label="Recent compiler runs"
            className="coverage-ops-run-list"
          >
            {runs === undefined ? (
              <p className="coverage-ops-empty">Loading runs.</p>
            ) : runs.length === 0 ? (
              <p className="coverage-ops-empty">
                No run has started in this deployment.
              </p>
            ) : (
              runs.map((run) => (
                <button
                  aria-current={
                    selectedRunId === run.runId ? 'true' : undefined
                  }
                  className="coverage-ops-run"
                  key={run.runId}
                  onClick={() => setSelectedRunId(run.runId)}
                  type="button"
                >
                  <RunStateIcon state={run.state} />
                  <span>
                    <strong>{rootNames.get(run.bodyKey) ?? run.bodyKey}</strong>
                    <small>
                      {formatTimestamp(run.startedAt)} · attempt {run.attempt}
                    </small>
                  </span>
                  <RunState state={run.state} />
                </button>
              ))
            )}
          </div>

          <div className="coverage-ops-detail">
            {selectedRunId === null || selectedRun === undefined ? (
              <p className="coverage-ops-empty">
                Select a run to inspect its chain of custody.
              </p>
            ) : selectedRun === null ? (
              <p className="coverage-ops-empty">That run no longer exists.</p>
            ) : (
              <>
                <div className="coverage-ops-detail-head">
                  <div>
                    <p>
                      {rootNames.get(selectedRun.run.bodyKey) ??
                        selectedRun.run.bodyKey}
                    </p>
                    <h3>
                      <RunState state={selectedRun.run.state} />
                    </h3>
                  </div>
                  <RunActions
                    pendingKey={pendingKey}
                    run={selectedRun.run}
                    onCancel={() =>
                      operate(
                        `cancel:${selectedRun.run.runId}`,
                        () => cancelRun({ runId: selectedRun.run.runId }),
                        'Run canceled.',
                      )
                    }
                    onRetry={() =>
                      operate(
                        `retry:${selectedRun.run.runId}`,
                        () => retryRun({ runId: selectedRun.run.runId }),
                        'Failed stage queued again.',
                      )
                    }
                  />
                </div>

                <ol className="coverage-ops-chain">
                  {selectedRun.stages.map((stage) => (
                    <li key={stage.stageId}>
                      <span className="coverage-ops-chain-mark" />
                      <div>
                        <p>
                          Attempt {stage.attempt} · gate {stage.gateVersion}
                        </p>
                        <h4>Verify official root</h4>
                        <RunState state={stage.state} />
                        {stage.resolvedRootUrl ? (
                          <code>{stage.resolvedRootUrl}</code>
                        ) : null}
                        {stage.errorDetail ? (
                          <strong className="coverage-ops-error">
                            {stage.errorDetail}
                          </strong>
                        ) : null}
                        {stage.redirectChain.length > 0 ? (
                          <details>
                            <summary>
                              {stage.redirectChain.length} recorded request
                              {stage.redirectChain.length === 1 ? '' : 's'}
                            </summary>
                            <ol>
                              {stage.redirectChain.map((hop, index) => (
                                <li key={`${hop.requestedUrl}:${index}`}>
                                  <code>
                                    {hop.status} {hop.requestedUrl}
                                  </code>
                                </li>
                              ))}
                            </ol>
                          </details>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>

                {selectedRun.findings.length > 0 ? (
                  <section
                    aria-labelledby="finding-heading"
                    className="coverage-ops-findings"
                  >
                    <h4 id="finding-heading">Findings</h4>
                    <ul>
                      {selectedRun.findings.map((finding) => (
                        <li key={finding.findingId}>
                          <CircleAlertIcon aria-hidden="true" />
                          <span>
                            <strong>{finding.code.replaceAll('_', ' ')}</strong>
                            {finding.summary}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function RunActions({
  onCancel,
  onRetry,
  pendingKey,
  run,
}: {
  onCancel: () => Promise<unknown>
  onRetry: () => Promise<unknown>
  pendingKey: string | null
  run: { runId: RunId; state: string }
}) {
  if (run.state === 'queued' || run.state === 'running') {
    return (
      <Button
        loading={pendingKey === `cancel:${run.runId}`}
        onClick={() => void onCancel()}
        size="sm"
        variant="destructive-outline"
      >
        <BanIcon aria-hidden="true" /> Cancel
      </Button>
    )
  }
  if (run.state === 'failed_retryable' || run.state === 'failed_terminal') {
    return (
      <Button
        loading={pendingKey === `retry:${run.runId}`}
        onClick={() => void onRetry()}
        size="sm"
        variant="outline"
      >
        <RefreshCwIcon aria-hidden="true" /> Retry stage
      </Button>
    )
  }
  return null
}

function RunState({ state }: { state: string }) {
  return (
    <span className="coverage-ops-state" data-state={state}>
      {state.replaceAll('_', ' ')}
    </span>
  )
}

function RunStateIcon({ state }: { state: string }) {
  if (state === 'succeeded') return <CheckCircle2Icon aria-hidden="true" />
  if (TERMINAL_STATES.has(state) && state !== 'succeeded')
    return <CircleAlertIcon aria-hidden="true" />
  return <Clock3Icon aria-hidden="true" />
}

function OperationsState({
  action,
  detail,
  error,
  title,
}: {
  action?: React.ReactNode
  detail: string
  error?: string | null
  title: string
}) {
  return (
    <main className="coverage-ops coverage-ops-centered" id="resident-main">
      <ShieldCheckIcon aria-hidden="true" />
      <p className="coverage-ops-kicker">Private owner operation</p>
      <h1>{title}</h1>
      <p>{detail}</p>
      {error ? (
        <p className="coverage-ops-error" role="alert">
          {error}
        </p>
      ) : null}
      {action}
    </main>
  )
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function operationError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'The operation did not finish. Inspect the run before trying again.'
}
