import {
  CheckCircle2Icon,
  Code2Icon,
  FileSearch2Icon,
  HistoryIcon,
  LockKeyholeIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'

import './coverage.css'

export function HowItWorksPage() {
  return (
    <main className="method-page" id="resident-main">
      <header className="method-intro">
        <div>
          <h1>How Public Parish works</h1>
          <p>
            Public Parish turns official local-government records into
            resident-readable decisions. Every published fact stays attached to
            the exact official evidence that supports it.
          </p>
        </div>
        <Button render={<Link to="/coverage" />} size="touch" variant="outline">
          View coverage
        </Button>
      </header>

      <section aria-labelledby="method-source-title" className="method-source">
        <div className="method-section-heading">
          <FileSearch2Icon aria-hidden="true" />
          <div>
            <h2 id="method-source-title">The source stays beside the claim</h2>
            <p>
              Dates, money, deadlines, votes, and outcomes use written Source
              controls. A Source opens the exact excerpt, document title, page
              or section, and retrieval date.
            </p>
          </div>
        </div>
        <ol className="method-sequence">
          <li>
            <span>1</span>
            <div>
              <h3>Find the official record</h3>
              <p>
                Public Parish monitors approved government domains and document
                hosts. News reports and social posts are not publication
                evidence.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Keep an unchanged source copy</h3>
              <p>
                Each retrieved page or file receives an immutable version so an
                older citation keeps resolving after the official source
                changes.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Check every material fact</h3>
              <p>
                Dates, names, amounts, links, and excerpts pass deterministic
                checks. A separate review tests whether the cited words support
                the claim.
              </p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <h3>Publish, limit, or withhold</h3>
              <p>
                Complete evidence can publish a full record. Missing evidence
                produces limited information or no publication. A second model
                cannot fill a missing fact.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section aria-labelledby="coverage-standard" className="method-standard">
        <div className="method-section-heading">
          <ShieldCheckIcon aria-hidden="true" />
          <div>
            <h2 id="coverage-standard">What supported coverage means</h2>
            <p>
              A government body must pass one common gate. Public Parish checks
              official domains, representative records, citations, source
              revisions, freshness expectations, and working document links.
            </p>
          </div>
        </div>
        <div className="method-standard-grid">
          <div>
            <CheckCircle2Icon aria-hidden="true" />
            <h3>Supported is earned</h3>
            <p>
              A place does not become supported because one document was found
              or one decision published.
            </p>
          </div>
          <div>
            <HistoryIcon aria-hidden="true" />
            <h3>Dated records stay visible</h3>
            <p>
              When a source is delayed, the last accepted information remains
              visible with its date and a factual freshness warning.
            </p>
          </div>
        </div>
      </section>

      <section className="method-principles">
        <div>
          <ScaleIcon aria-hidden="true" />
          <h2>Neutral about the decision</h2>
          <p>
            Public Parish explains documented consequence, process, evidence,
            deadlines, and public actions. It does not tell residents what
            position to take and never ranks by outrage or popularity.
          </p>
        </div>
        <div>
          <LockKeyholeIcon aria-hidden="true" />
          <h2>Private where the resident is private</h2>
          <p>
            Reading and Ask do not require an account. Public Parish requests no
            street address. Routine questions, alert details, and source problem
            reports stay private.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="method-corrections-title"
        className="method-corrections"
      >
        <div>
          <h2 id="method-corrections-title">
            When the official record changes
          </h2>
          <p>
            A new accepted source can update an issue without erasing the older
            record. Material changes appear in Update history as a Government
            update, More information posted, or Public Parish correction.
          </p>
          <p>
            A private source report does not change a page by itself. The normal
            evidence process must accept official support for the correction.
          </p>
        </div>
      </section>

      <details className="method-technical">
        <summary>
          <Code2Icon aria-hidden="true" />
          Technical details
        </summary>
        <div>
          <p>
            Convex stores source versions, processing state, public records,
            live updates, and resident-owned data. Firecrawl discovers and
            retrieves official pages and files.
          </p>
          <p>
            OpenAI calls run from Convex actions through Convex AI Gateway.
            Terra extracts records and issue links. Luna independently reviews
            cited facts and answers questions from published evidence. Code runs
            the final citation and publication checks.
          </p>
          <p>
            Public Parish is open source. The repository documents the schemas,
            validators, publication rules, and current integration limits.
          </p>
          <Button
            render={
              <a
                href="https://github.com/LaykenV/public-parish"
                rel="noreferrer"
                target="_blank"
              />
            }
            size="touch"
            variant="outline"
          >
            Open the source code
          </Button>
        </div>
      </details>
    </main>
  )
}
