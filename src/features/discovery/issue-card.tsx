import { CircleAlertIcon, CircleCheckIcon, Clock3Icon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { FollowAction } from '../following/follow-action'
import { evidenceJourneySearch } from '../resident-handoff/navigation'
import { formatDate, formatDay, formatTime } from './format'
import type {
  EvidenceStatus,
  IssueCardData,
  LifecycleState,
  UpcomingItemData,
} from './contracts'
import { ShareButton } from './share'

function stateTone(state: LifecycleState): 'active' | 'settled' | 'muted' {
  if (
    state === 'Scheduled' ||
    state === 'In progress' ||
    state === 'Developing'
  ) {
    return 'active'
  }
  if (state === 'Decided' || state === 'Completed' || state === 'Postponed') {
    return 'settled'
  }
  return 'muted'
}

function evidenceTone(status: EvidenceStatus): 'ok' | 'warning' {
  return status === 'Evidence available' ? 'ok' : 'warning'
}

function EvidenceIcon({ status }: { status: EvidenceStatus }) {
  const icons: Record<EvidenceStatus, LucideIcon> = {
    'Evidence available': CircleCheckIcon,
    'Limited information': CircleAlertIcon,
    'Source delayed': Clock3Icon,
    'Outcome not posted': CircleAlertIcon,
  }
  const Icon = icons[status]
  return <Icon aria-hidden="true" />
}

type IssueCardProps = {
  issue: IssueCardData
  reason?: string
  variant?: 'lead' | 'standard' | 'rail'
}

export function IssueCard({
  issue,
  reason,
  variant = 'standard',
}: IssueCardProps) {
  const journey = useRouterState({
    select: (state) => ({
      currentHref: state.location.href,
      hasDevelopmentFixture: Boolean(
        (state.location.search as Record<string, unknown> | undefined)?.fixture,
      ),
    }),
  })
  const href = issue.href ?? '/issues/' + issue.slug
  const external = href.startsWith('https://') || href.startsWith('http://')
  const showSecondaryActions = issue.showSecondaryActions ?? true
  const detailSearch = evidenceJourneySearch({
    currentHref: journey.currentHref,
    fixture: journey.hasDevelopmentFixture,
  })

  const dateLine = issue.nextDate
    ? `${issue.nextDate.label} · ${formatDate(issue.nextDate.date)}`
    : issue.latestOutcome
      ? `${issue.latestOutcome.label} · ${formatDate(issue.latestOutcome.date)}`
      : issue.state === 'Postponed'
        ? 'No new date posted'
        : issue.state === 'Decided' || issue.state === 'Completed'
          ? 'No outcome date posted'
          : 'No next date posted'

  return (
    <article className="pp-card" data-variant={variant}>
      {reason ? <p className="pp-card-reason">{reason}</p> : null}
      <header className="pp-card-head">
        <p className="pp-card-place">
          {issue.place} · {issue.body}
        </p>
        <p className="pp-card-state" data-tone={stateTone(issue.state)}>
          {issue.state}
        </p>
      </header>
      <div className="pp-card-main">
        <h3 className="pp-card-title">
          {external ? (
            <a href={href} rel="noreferrer" target="_blank">
              {issue.title}
            </a>
          ) : (
            <Link search={detailSearch} to={href}>
              {issue.title}
            </Link>
          )}
        </h3>
        <p className="pp-card-date">{dateLine}</p>
        {issue.whyMatter ? (
          <p className="pp-card-why">{issue.whyMatter}</p>
        ) : null}
      </div>
      <footer className="pp-card-side">
        <p
          className="pp-card-evidence"
          data-tone={evidenceTone(issue.evidence.status)}
        >
          <EvidenceIcon status={issue.evidence.status} />
          <span>
            {issue.evidence.status} · Checked{' '}
            {formatDate(issue.evidence.checked)}
          </span>
        </p>
        {issue.evidence.note ? (
          <p className="pp-card-evidence-note">{issue.evidence.note}</p>
        ) : null}
        <div className="pp-card-actions">
          <Button
            className="pp-card-view"
            render={
              external ? (
                <a href={href} rel="noreferrer" target="_blank" />
              ) : (
                <Link search={detailSearch} to={href} />
              )
            }
            size="touch"
            variant={variant === 'lead' ? 'default' : 'outline'}
          >
            {issue.primaryActionLabel ?? 'View issue'}
          </Button>
          {variant !== 'rail' && showSecondaryActions ? (
            <>
              <FollowAction
                available={
                  import.meta.env.DEV &&
                  journey.hasDevelopmentFixture &&
                  !external
                }
                className="pp-inline-action"
                target={{
                  kind: 'Issue',
                  title: issue.title,
                  detail: `${issue.place} · ${issue.body}`,
                }}
              />
              <ShareButton path={'/issues/' + issue.slug} title={issue.title} />
            </>
          ) : null}
        </div>
      </footer>
    </article>
  )
}

export function UpcomingCard({ item }: { item: UpcomingItemData }) {
  const journey = useRouterState({
    select: (state) => ({
      currentHref: state.location.href,
      hasDevelopmentFixture: Boolean(
        (state.location.search as Record<string, unknown> | undefined)?.fixture,
      ),
    }),
  })
  const detailSearch = evidenceJourneySearch({
    currentHref: journey.currentHref,
    fixture: journey.hasDevelopmentFixture,
  })

  return (
    <article className="pp-upcoming">
      <p className="pp-upcoming-date">
        <span className="pp-upcoming-day">{formatDay(item.date)}</span>
        <span className="pp-upcoming-time">{formatTime(item.date)}</span>
      </p>
      <div className="pp-upcoming-main">
        <p className="pp-upcoming-body">{item.body}</p>
        <h3 className="pp-upcoming-title">
          <Link search={detailSearch} to={item.href}>
            {item.title}
          </Link>
        </h3>
        <p className="pp-upcoming-detail">{item.detail}</p>
      </div>
    </article>
  )
}
