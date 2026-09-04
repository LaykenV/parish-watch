import { useState } from 'react'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '../../components/ui/button'

export function MonitoringPanel() {
  const overview = useQuery(api.operations.dashboard.monitoring, {})
  const configure = useMutation(api.monitoring.ledger.configure)
  const checkNow = useMutation(api.monitoring.ledger.checkNow)
  const [notice, setNotice] = useState('')
  const [kind, setKind] = useState<'pipeline' | 'ask' | 'compiler' | 'monitoring'>('monitoring')
  const usage = usePaginatedQuery(api.operations.dashboard.providerUsage, { kind }, { initialNumItems: 25 })
  const incidents = usePaginatedQuery(api.operations.dashboard.incidents, {}, { initialNumItems: 10 })
  const proposals = usePaginatedQuery(api.operations.dashboard.issueProposals, {}, { initialNumItems: 10 })
  if (!overview) return <p role="status">Loading source monitoring...</p>
  async function operate(task: () => Promise<unknown>) {
    try { await task(); setNotice('Operation saved.') } catch (error) { setNotice(error instanceof Error ? error.message : 'Operation failed.') }
  }
  return <section className="coverage-ops-roots" aria-labelledby="monitoring-title">
    <h2 id="monitoring-title">Approved source monitoring</h2>
    <p>{overview.enabled ? 'The deployment switch is on.' : 'The deployment switch is off. Scheduled source checks are dormant.'}</p>
    <p>New policies check daily, inspect up to 3 documents, start up to 5 decisions, and reserve at most 50 provider calls per day. The initial source window covers the past 30 days and suppresses backfill alerts.</p>
    <p role="status">{notice}</p>
    {overview.sources.map(source => <article key={source.proposalId}>
      <h3>{source.bodyName}</h3>
      <p>{source.policy?.enabled ? 'Monitoring enabled' : 'Monitoring paused'}{source.pendingTarget ? '. Decisions remain pending.' : ''}{source.failedTarget ? '. A decision needs attention.' : ''}</p>
      {source.policy?.lastCompletedAt ? <p>Last complete document check: {new Date(source.policy.lastCompletedAt).toLocaleString()}</p> : null}
      <Button disabled={!overview.enabled && !source.policy?.enabled} onClick={() => void operate(() => configure({ proposalId: source.proposalId, enabled: !source.policy?.enabled, intervalHours: source.policy?.intervalHours ?? 24, documentsPerRun: source.policy?.documentsPerRun ?? 3, targetsPerRun: source.policy?.targetsPerRun ?? 5, dailyCallLimit: source.policy?.dailyCallLimit ?? 50, startsAt: source.policy?.startsAt ?? Date.now() - 30 * 86_400_000 }))}>{source.policy?.enabled ? 'Pause checks' : 'Enable bounded checks'}</Button>
      {source.policy ? <Button disabled={!source.policy.enabled} onClick={() => void operate(() => checkNow({ policyId: source.policy!._id }))}>Check now</Button> : null}
    </article>)}
    <h3>Open source incidents</h3>
    {incidents.results.map(incident => <p key={incident._id}>{incident.summary} Attempts: {incident.attempts}. Last seen: {new Date(incident.lastSeenAt).toLocaleString()}.</p>)}
    {incidents.status === 'CanLoadMore' ? <Button onClick={() => incidents.loadMore(10)}>More incidents</Button> : null}
    <h3>Issue proposals</h3>
    {proposals.results.map(proposal => <p key={proposal._id}>{proposal.state}. Checked {proposal.scanned} candidate records. {proposal.errorClass ?? ''}</p>)}
    {proposals.status === 'CanLoadMore' ? <Button onClick={() => proposals.loadMore(10)}>More proposals</Button> : null}
    <h3>Civic activity counts</h3>
    <p>Evidence opens, document opens, returns, and outcome reads are browser-reported. Question, answer, follow, and request counts come from successful server operations. Development and production stay separate. These counts do not prove resident benefit.</p>
    <ul>{overview.counters.map(counter => <li key={counter._id}>{counter.environment}: {counter.kind.replaceAll('_', ' ')}: {counter.count}</li>)}</ul>
    <h3>Provider usage</h3>
    <label>Work type <select value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="monitoring">Source monitoring</option><option value="pipeline">Evidence pipeline</option><option value="compiler">Coverage compiler</option><option value="ask">Resident Ask</option></select></label>
    <p>Costs are estimates. Missing provider usage means unknown, not zero. This list shows the loaded page, not a complete spending total.</p>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Time</th><th>Operation</th><th>Provider and model</th><th>Status</th><th>Tokens</th><th>Estimated USD</th><th>Credits</th></tr></thead><tbody>{usage.results.map(row => <tr key={row.id}><td>{new Date(row.at).toLocaleString()}</td><td>{row.operation}</td><td>{row.provider} {row.model ?? ''}</td><td>{row.status}</td><td>{row.tokens ?? 'Unknown'}</td><td>{row.estimatedCostUsd ?? 'Unknown'}</td><td>{('credits' in row ? row.credits : undefined) ?? 'Unknown'}</td></tr>)}</tbody></table></div>
    {usage.status === 'CanLoadMore' ? <Button onClick={() => usage.loadMore(25)}>More provider calls</Button> : null}
  </section>
}
