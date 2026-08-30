import { RotateCwIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../../components/ui/button'

export const DISCOVERY_FIXTURE_LABEL =
  'Every record on this page is design-only fixture data, not a production civic claim.'

export function getDiscoveryFixtureLabel(scenarioLabel?: string): string {
  return scenarioLabel
    ? `${DISCOVERY_FIXTURE_LABEL} ${scenarioLabel}`
    : DISCOVERY_FIXTURE_LABEL
}

export function Notice({
  action,
  children,
  title,
  tone = 'info',
}: {
  action?: ReactNode
  children?: ReactNode
  title: string
  tone?: 'info' | 'warning'
}) {
  return (
    <div className="pp-notice" data-tone={tone}>
      <div className="pp-notice-body">
        <p className="pp-notice-title">{title}</p>
        {children ? <div className="pp-notice-text">{children}</div> : null}
      </div>
      {action ? <div className="pp-notice-action">{action}</div> : null}
    </div>
  )
}

export function FixtureBanner({ label }: { label: string }) {
  return (
    <div className="pp-fixture-banner" role="note">
      <strong>Design fixture</strong>
      <span>{label}</span>
    </div>
  )
}

export function SectionFailure({
  label,
  onRetry,
}: {
  label: string
  onRetry: () => void
}) {
  return (
    <div className="pp-section-failure">
      <p className="pp-section-failure-title">{label} could not load.</p>
      <p className="pp-section-failure-text">
        Other sections are still available.
      </p>
      <Button onClick={onRetry} size="touch" variant="outline">
        <RotateCwIcon aria-hidden="true" />
        Retry
      </Button>
    </div>
  )
}

export function UpdateRow({
  label = 'Feed update',
  onRefresh,
}: {
  label?: string
  onRefresh: () => void
}) {
  return (
    <div aria-label={label} className="pp-update-row" role="region">
      <span aria-hidden="true" className="pp-update-dot" />
      <p>Update available</p>
      <Button onClick={onRefresh} size="touch" variant="outline">
        Refresh
      </Button>
    </div>
  )
}
