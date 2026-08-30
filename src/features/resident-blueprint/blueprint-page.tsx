import { ArrowRightIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import type { BlueprintAction, BlueprintKey } from './route-contracts'
import { getResidentBlueprint } from './route-contracts'
import { ResidentShell, ResidentStandalone } from './resident-shell'

export function BlueprintPage({
  contractKey,
  routeDetail,
  standalone = false,
}: {
  contractKey: BlueprintKey
  routeDetail?: ReactNode
  standalone?: boolean
}) {
  const blueprint = getResidentBlueprint(contractKey)
  const showsEvidenceRail = ['issue', 'decision', 'ask'].includes(contractKey)

  const page = (
    <div className="blueprint-backdrop">
      <main className="blueprint-main" id="resident-main">
        <span className="visually-hidden" id="blueprint-inert-note">
          This control is placed for the low-fidelity prototype and is not
          connected.
        </span>
        <div className="blueprint-fixture-notice" role="note">
          <span>Low-fidelity prototype</span>
          <p>{blueprint.fixture}</p>
        </div>

        <header className="blueprint-page-header">
          <p className="blueprint-eyebrow">{blueprint.eyebrow}</p>
          <h1>{blueprint.title}</h1>
          <p className="blueprint-description">{blueprint.description}</p>
          {routeDetail ? (
            <p className="blueprint-route-detail">{routeDetail}</p>
          ) : null}
          <ActionRow actions={blueprint.actions} />
        </header>

        <div
          className="blueprint-layout"
          data-evidence-rail={showsEvidenceRail ? '' : undefined}
        >
          <div className="blueprint-reading-column">
            {blueprint.sections.map((section) => (
              <section className="blueprint-section" key={section.title}>
                <div className="blueprint-section-heading">
                  <span aria-hidden="true" />
                  <h2>{section.title}</h2>
                </div>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {section.actions ? (
                  <ActionRow actions={section.actions} />
                ) : null}
              </section>
            ))}
          </div>

          <aside
            className="blueprint-contract-rail"
            aria-label="Page state contract"
          >
            <section>
              <h2>Required states</h2>
              <ul>
                {blueprint.states.map((state) => (
                  <li key={state}>{state}</li>
                ))}
              </ul>
            </section>

            {showsEvidenceRail ? (
              <section className="blueprint-evidence-region">
                <div className="blueprint-evidence-heading">
                  <FileTextIcon aria-hidden="true" />
                  <h2>Evidence panel</h2>
                </div>
                <p>
                  Source controls open the exact excerpt here on desktop. The
                  same content uses a bottom sheet on mobile.
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  )

  return standalone ? (
    <ResidentStandalone>{page}</ResidentStandalone>
  ) : (
    <ResidentShell>{page}</ResidentShell>
  )
}

export function BlueprintNotFound() {
  return (
    <ResidentShell>
      <div className="blueprint-backdrop">
        <main className="blueprint-main blueprint-not-found" id="resident-main">
          <div className="blueprint-fixture-notice" role="note">
            <span>Required state</span>
            <p>Route not found</p>
          </div>
          <header className="blueprint-page-header">
            <p className="blueprint-eyebrow">Not found</p>
            <h1>This page does not exist.</h1>
            <p className="blueprint-description">
              The final state will offer recovery through Home, Explore, or the
              relevant Coverage page without guessing which record you meant.
            </p>
            <ActionRow
              actions={[
                { href: '/', label: 'Return home', treatment: 'primary' },
                { href: '/explore', label: 'Explore records' },
              ]}
            />
          </header>
        </main>
      </div>
    </ResidentShell>
  )
}

function ActionRow({ actions }: { actions: BlueprintAction[] }) {
  if (actions.length === 0) return null

  return (
    <div className="blueprint-actions">
      {actions.map((action) => {
        const className = `blueprint-action blueprint-action-${action.treatment ?? 'secondary'}`

        if (action.href) {
          const internal = action.href.startsWith('/')

          if (internal) {
            return (
              <Link className={className} key={action.label} to={action.href}>
                {action.label}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            )
          }

          return (
            <a className={className} href={action.href} key={action.label}>
              {action.label}
              <ExternalLinkIcon aria-hidden="true" />
            </a>
          )
        }

        return (
          <button
            aria-describedby="blueprint-inert-note"
            className={className}
            key={action.label}
            type="button"
          >
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
