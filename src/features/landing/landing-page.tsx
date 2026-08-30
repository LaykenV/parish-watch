import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { LouisianaRelief } from './louisiana-relief'

import './landing.css'

const REPOSITORY_URL = 'https://github.com/LaykenV/public-parish'
const BUILD_LOG_URL = `${REPOSITORY_URL}/blob/main/hackathon.md`

const STEPS = [
  {
    title: 'Find the official record',
    copy: 'Public Parish watches validated local-government sources.',
  },
  {
    title: 'Attach the evidence',
    copy: 'Dates, amounts, deadlines, and outcomes stay tied to exact excerpts.',
  },
  {
    title: 'Make it understandable',
    copy: 'Residents see what may change and ask questions from the same evidence.',
  },
  {
    title: 'Follow what happens',
    copy: 'Material changes and final outcomes return to the issue and its followers.',
  },
]

const PARISHES = [
  'Lafayette Parish',
  'Rapides Parish',
  'East Baton Rouge Parish',
]

export function LandingPage() {
  return (
    <div className="landing">
      <main id="resident-main">
        <LandingHero />
        <LandingTraverse />
        <TrustSection />
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p className="provenance">
            Free, open source, and built for the Convex All Gas Hackathon.
          </p>
          <ul className="footer-links">
            <li>
              <a href={REPOSITORY_URL}>Repository</a>
            </li>
            <li>
              <a href={BUILD_LOG_URL}>Build log</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

function LandingHero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-intro">
          <p className="hero-kicker">
            Louisiana local decisions, with receipts.
          </p>
          <h1 id="hero-title">See how local government is changing.</h1>
        </div>

        <div className="hero-details">
          <p className="hero-lede">
            Public Parish connects Louisiana decisions to the official record,
            public deadlines, and what happens next.
          </p>
          <div className="hero-actions">
            <Button
              className="hero-primary"
              render={<a href={REPOSITORY_URL} />}
              size="xl"
            >
              Follow the build
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
            <p className="hero-note">
              Free. Open source. No account needed to read.
            </p>
          </div>
        </div>

        <div className="hero-relief">
          <LouisianaRelief />
        </div>
      </div>
    </section>
  )
}

function TraverseStep({
  index,
  title,
  copy,
}: {
  index: number
  title: string
  copy: string
}) {
  return (
    <li className={index === 0 ? 'station on' : 'station'}>
      <span className="station-marker" aria-hidden="true">
        {index + 1}
      </span>
      <div className="station-inner">
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </li>
  )
}

function LandingTraverse() {
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const stations = Array.from(list.querySelectorAll<HTMLElement>('.station'))
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reduced) {
      stations.forEach((station) => station.classList.add('on'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add('on')
        }
      },
      { rootMargin: '0px 0px -18% 0px', threshold: 0.35 },
    )

    stations.forEach((station) => observer.observe(station))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="proof" aria-labelledby="proof-title">
      <div className="container proof-grid">
        <div className="proof-intro">
          <p className="section-label">How it works</p>
          <h2 id="proof-title">One line from record to resident.</h2>
          <p>
            The source stays attached as information moves through Public
            Parish.
          </p>
        </div>
        <ol className="traverse" ref={listRef}>
          {STEPS.map((step, index) => (
            <TraverseStep
              key={step.title}
              index={index}
              title={step.title}
              copy={step.copy}
            />
          ))}
        </ol>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="trust" aria-labelledby="trust-title">
      <div className="container trust-grid">
        <div className="trust-head">
          <p className="section-label">Publication standard</p>
          <h2 id="trust-title">See the source behind every claim.</h2>
          <p className="trust-copy">
            Public Parish publishes from validated official records. Dates,
            amounts, deadlines, and outcomes link to the exact source. If
            evidence is missing, the page says so.
          </p>
          <p className="coverage-copy">
            Building first for Lafayette Parish, Rapides Parish, and East Baton
            Rouge Parish. A place appears as supported only after its sources
            pass the same evidence checks.
          </p>
        </div>
        <dl className="plots">
          {PARISHES.map((parish, index) => (
            <div className="plot-row" key={parish}>
              <span className="plot-index" aria-hidden="true">
                {index + 1}
              </span>
              <dt className="plot-name">{parish}</dt>
              <dd>
                <Badge variant="secondary">Planned first</Badge>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
