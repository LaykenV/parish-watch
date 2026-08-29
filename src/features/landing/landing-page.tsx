import { useEffect, useRef } from 'react'

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

const PARISHES = ['Lafayette Parish', 'Rapides Parish', 'East Baton Rouge Parish']

export function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container">
          <a className="brand" href="/" aria-label="Public Parish home">
            <svg
              className="brand-mark"
              viewBox="0 0 64 64"
              role="img"
              aria-label="Public Parish mark"
            >
              <path
                d="M19 54V10h18c10 0 17 6.2 17 15.5S47 41 37 41H19"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="8"
              />
            </svg>
            <span className="brand-name">Public Parish</span>
          </a>
          <a className="btn btn-small" href={REPOSITORY_URL}>
            Follow the build
          </a>
        </div>
      </header>

      <main id="main">
        <LandingHero />
        <LandingTraverse />
        <TrustSection />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="provenance">
            Free, open source, and built for the Convex All Gas Hackathon.
          </p>
          <div className="footer-side">
            <ul className="footer-links">
              <li>
                <a href={REPOSITORY_URL}>Repository</a>
              </li>
              <li>
                <a href={BUILD_LOG_URL}>Build log</a>
              </li>
            </ul>
            <svg className="north-mark" viewBox="0 0 40 40" aria-hidden="true">
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M20 7v18M20 7l-5 9M20 7l5 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LandingHero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title">See how local government is changing.</h1>
          <p className="hero-lede">
            Public Parish connects Louisiana decisions to the official record, public
            deadlines, and what happens next.
          </p>
          <div className="hero-actions">
            <a className="btn" href={REPOSITORY_URL}>
              Follow the build
            </a>
            <p className="hero-note">Lafayette · Rapides · East Baton Rouge first</p>
          </div>
        </div>

        <div className="field-sheets" aria-hidden="true">
          <div className="fsheet fsheet-1" />
          <div className="fsheet fsheet-2" />
          <div className="fsheet fsheet-3" />
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
      <span className="station-marker" aria-hidden="true" />
      <div className="station-card station-inner">
        <span className="station-no" aria-hidden="true">
          Step {index + 1}
        </span>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </li>
  )
}

function LandingTraverse() {
  const listRef = useRef<HTMLOListElement>(null)
  const walkerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const list = listRef.current
    const walker = walkerRef.current
    if (!list || !walker) return

    const stations = Array.from(list.querySelectorAll<HTMLElement>('.station'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      stations.forEach((station) => station.classList.add('on'))
      return
    }

    let current = -1

    const moveWalker = (station: HTMLElement) => {
      const marker = station.querySelector<HTMLElement>('.station-marker')
      if (!marker) return
      const listRect = list.getBoundingClientRect()
      const markerRect = marker.getBoundingClientRect()
      const y = markerRect.top + markerRect.height / 2 - listRect.top - 4
      walker.style.setProperty('--walker', `${y}px`)
    }

    const update = () => {
      const lineY = window.innerHeight * 0.68
      let index = 0
      stations.forEach((station, i) => {
        if (station.getBoundingClientRect().top < lineY) index = i
      })
      const scrollEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 60
      if (scrollEnd) index = stations.length - 1
      if (index === current) return
      current = index
      stations.forEach((station, i) => {
        station.classList.toggle('on', i <= index)
      })
      moveWalker(stations[index])
    }

    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.fonts.ready.then(schedule).catch(schedule)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="proof" aria-label="How evidence becomes an update">
      <div className="container">
        <div className="traverse-wrap">
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
          <span className="walker" aria-hidden="true" ref={walkerRef} />
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="trust" aria-labelledby="trust-title">
      <div className="container">
        <div className="trust-head">
          <h2 id="trust-title">See the source behind every claim.</h2>
          <p className="trust-copy">
            Public Parish publishes from validated official records. Dates, amounts,
            deadlines, and outcomes link to the exact source. If evidence is missing, the
            page says so.
          </p>
          <p className="coverage-copy">
            Building first for Lafayette Parish, Rapides Parish, and East Baton Rouge
            Parish. A place appears as supported only after its sources pass the same
            evidence checks.
          </p>
        </div>
        <dl className="plots">
          {PARISHES.map((parish) => (
            <div className="plot-row" key={parish}>
              <dt className="plot-name">{parish}</dt>
              <dd className="plot-state">Planned first</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
