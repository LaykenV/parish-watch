import { ChevronRightIcon } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

import { formatDate } from './format'
import type { ResultRowData } from './contracts'
import { evidenceJourneySearch } from '../resident-handoff/navigation'

export function ResultRow({ row }: { row: ResultRowData }) {
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
  const metaParts = [
    row.place,
    row.body,
    row.date ? formatDate(row.date) : undefined,
    row.state,
    row.id,
  ].filter((part): part is string => Boolean(part))

  if (row.kind === 'Government body') {
    return (
      <Link className="pp-row" data-kind={row.kind} to="/coverage">
        <span className="pp-row-type">{row.kind}</span>
        <span className="pp-row-main">
          <span className="pp-row-title">{row.title}</span>
          <span className="pp-row-meta">
            {row.place} ·{' '}
            <span
              data-coverage={row.coverage === 'Supported' ? 'ok' : 'warning'}
            >
              {row.coverage}
            </span>{' '}
            · View coverage
          </span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="pp-row-chevron" />
      </Link>
    )
  }

  const content = (
    <>
      <span className="pp-row-type">{row.kind}</span>
      <span className="pp-row-main">
        <span className="pp-row-title">{row.title}</span>
        {metaParts.length > 0 ? (
          <span className="pp-row-meta">{metaParts.join(' · ')}</span>
        ) : null}
      </span>
      <ChevronRightIcon aria-hidden="true" className="pp-row-chevron" />
    </>
  )

  return row.href.startsWith('https://') || row.href.startsWith('http://') ? (
    <a
      className="pp-row"
      data-kind={row.kind}
      href={row.href}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  ) : (
    <Link
      className="pp-row"
      data-kind={row.kind}
      search={detailSearch}
      to={row.href}
    >
      {content}
    </Link>
  )
}
