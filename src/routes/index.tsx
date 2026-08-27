import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'

import { setupStatusQuery } from './index.data'
import { describeBackendState } from '../features/setup/setup-status'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const status = useQuery(setupStatusQuery)

  return (
    <main className="setup-shell">
      <section className="setup-card" aria-labelledby="page-title">
        <p className="eyebrow">Phase 0 setup proof</p>
        <h1 id="page-title">Parish Watch</h1>
        <p className="lede">
          Louisiana local-government decisions, tied to the official record.
        </p>

        <dl className="setup-grid">
          <div>
            <dt>Frontend</dt>
            <dd>TanStack Start SPA</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>{describeBackendState(status?.state)}</dd>
          </div>
          <div>
            <dt>Hosting target</dt>
            <dd>Convex static hosting</dd>
          </div>
        </dl>

        <p className="next-step">
          The evidence pipeline comes next. No civic claims are published from
          this setup screen.
        </p>
      </section>
    </main>
  )
}
