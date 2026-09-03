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

const COVERAGE_STAGE_LABELS = {
  verify_root: 'Verify official root',
  discover_sources: 'Discover source candidates',
  classify_sources: 'Classify source candidates',
  validate_sample: 'Validate representative sample',
  evaluate_gates: 'Evaluate coverage gates',
} as const

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
            onClick={() => void auth.signInGoogle()}
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
  const discoverSources = useMutation(api.coverage.operations.discover)
  const cancelRun = useMutation(api.coverage.operations.cancel)
  const retryRun = useMutation(api.coverage.operations.retry)
  const prepareProposal = useMutation(api.coverage.proposals.prepareProposal)
  const startValidation = useMutation(api.coverage.validation.startValidation)
  const reevaluateProposal = useMutation(api.coverage.validation.reevaluate)
  const confirmPromotion = useMutation(api.coverage.promotion.confirmPromotion)
  const setCoverageStatus = useMutation(
    api.coverage.promotion.setCoverageStatus,
  )
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

  async function operate(key: string, task: () => Promise<string>) {
    setPendingKey(key)
    setMessage(null)
    try {
      setMessage(await task())
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
                        void operate(`start:${root.bodyKey}`, async () => {
                          const result = await startRun({
                            bodyKey: root.bodyKey,
                            rootManifestVersion: root.version,
                          })
                          setSelectedRunId(result.runId)
                          return result.created
                            ? `${root.bodyName} run started.`
                            : `${root.bodyName} already has an active or successful run.`
                        })
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
                    canDiscover={
                      selectedRun.run.state === 'succeeded' &&
                      selectedRun.stages.every(
                        (stage) => stage.stage === 'verify_root',
                      )
                    }
                    pendingKey={pendingKey}
                    run={selectedRun.run}
                    onCancel={() =>
                      operate(`cancel:${selectedRun.run.runId}`, async () => {
                        const result = await cancelRun({
                          runId: selectedRun.run.runId,
                        })
                        return result.canceled
                          ? 'Run canceled.'
                          : 'The run had already stopped, so nothing changed.'
                      })
                    }
                    onRetry={() =>
                      operate(`retry:${selectedRun.run.runId}`, async () => {
                        const result = await retryRun({
                          runId: selectedRun.run.runId,
                        })
                        return result.retried
                          ? 'Failed stage queued again.'
                          : 'The failed stage could not be queued again.'
                      })
                    }
                    onDiscover={() =>
                      operate(`discover:${selectedRun.run.runId}`, async () => {
                        const result = await discoverSources({
                          runId: selectedRun.run.runId,
                        })
                        return result.started
                          ? 'Bounded source discovery started.'
                          : 'Source discovery was already started or is not ready.'
                      })
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
                        <h4>{COVERAGE_STAGE_LABELS[stage.stage]}</h4>
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

                {selectedRun.providerCalls.length > 0 ? (
                  <section
                    aria-labelledby="provider-heading"
                    className="coverage-ops-findings coverage-ops-provider-calls"
                  >
                    <h4 id="provider-heading">Provider evidence</h4>
                    <p>
                      {selectedRun.providerCalls.length} calls ·{' '}
                      {formatCost(
                        selectedRun.providerCalls.reduce(
                          (total, call) => total + (call.estimatedCostUsd ?? 0),
                          0,
                        ),
                      )}{' '}
                      estimated model cost
                    </p>
                    <ul>
                      {selectedRun.providerCalls.map((call) => (
                        <li key={call.providerCallId}>
                          <Clock3Icon aria-hidden="true" />
                          <span>
                            <strong>
                              {call.provider} · {call.operation}
                            </strong>
                            {call.status} in {call.latencyMs} ms
                            {call.creditsReported
                              ? ` · ${call.creditsUsed ?? 0} credits`
                              : call.provider === 'firecrawl'
                                ? ' · provider did not report credits'
                                : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {selectedRun.candidates.length > 0 ? (
                  <section
                    aria-labelledby="candidate-heading"
                    className="coverage-ops-candidates"
                  >
                    <h4 id="candidate-heading">
                      Source candidates{' '}
                      <span>{selectedRun.candidates.length}</span>
                    </h4>
                    <ul>
                      {selectedRun.candidates.map((candidate) => (
                        <li key={candidate.candidateId}>
                          <div>
                            <strong>
                              {candidate.title ??
                                candidate.sourceKind ??
                                'Unlabeled source'}
                            </strong>
                            <a
                              href={candidate.canonicalUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {candidate.canonicalUrl}
                            </a>
                          </div>
                          <div>
                            <RunState state={candidate.state} />
                            {candidate.sourceKind ? (
                              <small>
                                {candidate.sourceKind.replaceAll('_', ' ')} ·{' '}
                                {candidate.cadence?.replaceAll('_', ' ')}
                              </small>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {selectedRun.run.currentStage === 'classify_sources' ||
                selectedRun.proposals.length > 0 ? (
                  <ProposalPanel
                    onPrepare={() =>
                      operate(`prepare:${selectedRun.run.runId}`, async () => {
                        const result = await prepareProposal({
                          runId: selectedRun.run.runId,
                        })
                        return result.created
                          ? 'Registry proposal prepared.'
                          : 'The existing registry proposal was reused.'
                      })
                    }
                    onPromote={(proposalId) => {
                      if (
                        !window.confirm(
                          'Promote this body to supported coverage? This changes resident-visible coverage state.',
                        )
                      ) {
                        return Promise.resolve()
                      }
                      return operate(`promote:${proposalId}`, async () => {
                        const result = await confirmPromotion({ proposalId })
                        return result.replayed
                          ? 'Coverage was already promoted.'
                          : 'Coverage promoted.'
                      })
                    }}
                    onReevaluate={(proposalId) =>
                      operate(`evaluate:${proposalId}`, async () => {
                        const result = await reevaluateProposal({ proposalId })
                        return result.started
                          ? 'Coverage gates queued for evaluation.'
                          : 'Coverage evaluation was already running or is unavailable.'
                      })
                    }
                    onSetStatus={(proposalId, status) =>
                      operate(`status:${proposalId}:${status}`, async () => {
                        const result = await setCoverageStatus({
                          proposalId,
                          status,
                        })
                        if (!result.changed) {
                          return `Coverage was already ${status} or cannot change from this proposal.`
                        }
                        return result.recovered
                          ? 'Coverage recovered after the gates passed again.'
                          : `Coverage changed to ${status}.`
                      })
                    }
                    onValidate={(proposalId) =>
                      operate(`validate:${proposalId}`, async () => {
                        const result = await startValidation({ proposalId })
                        return result.started
                          ? 'Representative sample validation started.'
                          : 'Sample validation was already running or is unavailable.'
                      })
                    }
                    pendingKey={pendingKey}
                    proposals={selectedRun.proposals}
                    runId={selectedRun.run.runId}
                  />
                ) : null}

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
  canDiscover,
  onCancel,
  onDiscover,
  onRetry,
  pendingKey,
  run,
}: {
  canDiscover: boolean
  onCancel: () => Promise<unknown>
  onDiscover: () => Promise<unknown>
  onRetry: () => Promise<unknown>
  pendingKey: string | null
  run: { runId: RunId; state: string; currentStage?: string | null }
}) {
  if (canDiscover) {
    return (
      <Button
        loading={pendingKey === `discover:${run.runId}`}
        onClick={() => void onDiscover()}
        size="sm"
      >
        Discover sources
      </Button>
    )
  }
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
  if (
    (run.state === 'failed_retryable' || run.state === 'failed_terminal') &&
    (run.currentStage === 'verify_root' ||
      run.currentStage === 'discover_sources' ||
      run.currentStage === 'classify_sources')
  ) {
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

type Proposal = {
  proposalId: Id<'coverageRegistryProposals'>
  proposalVersion: number
  status:
    'draft' | 'validating' | 'blocked' | 'ready' | 'promoted' | 'superseded'
  goldSetVersion: string
  diffSummary: string[]
  sampleCount: number
  retrievedSampleCount: number
  samples: Array<{
    sourceKind: string
    role: string
    state: string
    canonicalUrl: string | null
    errorClass: string | null
  }>
  gates: Array<{
    gateNumber: number
    gateKey: string
    passed: boolean
    detail: string
  }>
}

function ProposalPanel({
  onPrepare,
  onPromote,
  onReevaluate,
  onSetStatus,
  onValidate,
  pendingKey,
  proposals,
  runId,
}: {
  onPrepare: () => Promise<unknown>
  onPromote: (proposalId: Proposal['proposalId']) => Promise<unknown>
  onReevaluate: (proposalId: Proposal['proposalId']) => Promise<unknown>
  onSetStatus: (
    proposalId: Proposal['proposalId'],
    status: 'supported' | 'degraded' | 'paused',
  ) => Promise<unknown>
  onValidate: (proposalId: Proposal['proposalId']) => Promise<unknown>
  pendingKey: string | null
  proposals: Proposal[]
  runId: RunId
}) {
  const proposal = proposals.at(0)
  if (!proposal) {
    return (
      <section className="coverage-ops-proposal">
        <div>
          <p className="coverage-ops-step">Step 3</p>
          <h4>Prepare a registry proposal</h4>
          <p>
            Freeze the classified official sources into a diff before any
            representative sample can run.
          </p>
        </div>
        <Button
          loading={pendingKey === `prepare:${runId}`}
          onClick={() => void onPrepare()}
          size="sm"
          variant="outline"
        >
          Prepare proposal
        </Button>
      </section>
    )
  }

  return (
    <section className="coverage-ops-proposal">
      <div className="coverage-ops-proposal-head">
        <div>
          <p className="coverage-ops-step">Step 3</p>
          <h4>
            Registry proposal v{proposal.proposalVersion}{' '}
            <RunState state={proposal.status} />
          </h4>
          <p>
            {proposal.retrievedSampleCount} of {proposal.sampleCount} sample
            sources retrieved · {proposal.goldSetVersion}
          </p>
        </div>
        <div className="coverage-ops-proposal-actions">
          {proposal.status === 'draft' || proposal.status === 'blocked' ? (
            <Button
              loading={pendingKey === `validate:${proposal.proposalId}`}
              onClick={() => void onValidate(proposal.proposalId)}
              size="sm"
            >
              {proposal.status === 'draft' ? 'Validate sample' : 'Retry sample'}
            </Button>
          ) : null}
          {proposal.status === 'blocked' ? (
            <Button
              loading={pendingKey === `evaluate:${proposal.proposalId}`}
              onClick={() => void onReevaluate(proposal.proposalId)}
              size="sm"
              variant="outline"
            >
              Re-evaluate gates
            </Button>
          ) : null}
          {proposal.status === 'ready' ? (
            <Button
              loading={pendingKey === `promote:${proposal.proposalId}`}
              onClick={() => void onPromote(proposal.proposalId)}
              size="sm"
            >
              Promote coverage
            </Button>
          ) : null}
          {proposal.status === 'promoted' ? (
            <>
              <Button
                loading={pendingKey === `evaluate:${proposal.proposalId}`}
                onClick={() => void onReevaluate(proposal.proposalId)}
                size="sm"
                variant="outline"
              >
                Re-evaluate gates
              </Button>
              <Button
                loading={
                  pendingKey === `status:${proposal.proposalId}:degraded`
                }
                onClick={() =>
                  void onSetStatus(proposal.proposalId, 'degraded')
                }
                size="sm"
                variant="outline"
              >
                Mark degraded
              </Button>
              <Button
                loading={pendingKey === `status:${proposal.proposalId}:paused`}
                onClick={() => void onSetStatus(proposal.proposalId, 'paused')}
                size="sm"
                variant="outline"
              >
                Pause
              </Button>
              <Button
                loading={
                  pendingKey === `status:${proposal.proposalId}:supported`
                }
                onClick={() =>
                  void onSetStatus(proposal.proposalId, 'supported')
                }
                size="sm"
                variant="outline"
              >
                Recover
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <ul className="coverage-ops-diff">
        {proposal.diffSummary.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
      <ul
        aria-label="Representative source health"
        className="coverage-ops-samples"
      >
        {proposal.samples.map((sample, index) => (
          <li key={`${sample.sourceKind}:${sample.role}:${index}`}>
            <div>
              <strong>{sample.sourceKind.replaceAll('_', ' ')}</strong>
              <span>{sample.role.replaceAll('_', ' ')}</span>
            </div>
            <div>
              <RunState state={sample.state} />
              {sample.errorClass ? (
                <code>{sample.errorClass.replaceAll('_', ' ')}</code>
              ) : null}
            </div>
            {sample.canonicalUrl ? (
              <a href={sample.canonicalUrl} rel="noreferrer" target="_blank">
                Inspect source <ExternalLinkIcon aria-hidden="true" />
              </a>
            ) : (
              <span>No candidate found</span>
            )}
          </li>
        ))}
      </ul>
      {proposal.gates.length > 0 ? (
        <ol className="coverage-ops-gates">
          {proposal.gates.map((gate) => (
            <li
              data-passed={gate.passed ? '' : undefined}
              key={gate.gateNumber}
            >
              <span>{gate.gateNumber}</span>
              <div>
                <strong>{gate.gateKey.replaceAll('_', ' ')}</strong>
                <p>{gate.detail}</p>
              </div>
              {gate.passed ? (
                <CheckCircle2Icon aria-label="Passed" />
              ) : (
                <CircleAlertIcon aria-label="Blocked" />
              )}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
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

function formatCost(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.01 ? 4 : 2,
  }).format(value)
}

function operationError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'The operation did not finish. Inspect the run before trying again.'
}
