import {
  BarChart3Icon,
  CircleSlash2Icon,
  DatabaseIcon,
  KeyRoundIcon,
  MailIcon,
  MessageCircleQuestionIcon,
  Share2Icon,
} from 'lucide-react'

import './privacy.css'

const PRIVACY_EMAIL = 'public-parish-reports@agentmail.to'

export function PrivacyPage() {
  return (
    <main className="privacy-page" id="resident-main">
      <header className="privacy-intro">
        <p>Privacy notice</p>
        <h1>Your civic questions are not public.</h1>
        <div>
          <p>
            Public Parish publishes government evidence, not resident activity.
            You can read records and ask source-grounded questions without an
            account or a street address.
          </p>
          <time dateTime="2026-09-02">Effective September 2, 2026</time>
        </div>
      </header>

      <section aria-labelledby="privacy-ledger-title" className="privacy-ledger">
        <div className="privacy-section-heading">
          <DatabaseIcon aria-hidden="true" />
          <div>
            <h2 id="privacy-ledger-title">What the service keeps</h2>
            <p>
              The details depend on which parts of Public Parish you choose to
              use.
            </p>
          </div>
        </div>

        <dl>
          <div>
            <dt>
              <KeyRoundIcon aria-hidden="true" />
              Google account
            </dt>
            <dd>
              If you sign in, Public Parish stores your Google account ID,
              verified email, optional name and profile picture, sign-in
              timestamps, saved areas, and saved topics. Google does not share
              your password or Gmail contents with Public Parish.
            </dd>
            <dd className="privacy-retention">
              Kept until the account is deleted
            </dd>
          </div>
          <div>
            <dt>
              <MessageCircleQuestionIcon aria-hidden="true" />
              Ask
            </dt>
            <dd>
              Public Parish stores your question, the evidence used, and the
              generated answer in a private thread. A random browser token
              controls access. The server stores a hash of that token, not the
              token itself. Public Parish currently retains the private thread
              after browser access expires so the owner can review failures and
              abuse.
            </dd>
            <dd className="privacy-retention">
              Browser access expires after 24 hours
            </dd>
          </div>
          <div>
            <dt>
              <BarChart3Icon aria-hidden="true" />
              Anonymous product counts
            </dt>
            <dd>
              In production, Public Parish counts visits and selected launch
              areas. A random browser ID is hashed before upload. These events
              do not include your name, email, question text, or exact location.
            </dd>
            <dd className="privacy-retention">
              Individual event records expire after 90 days
            </dd>
          </div>
        </dl>
      </section>

      <section className="privacy-boundary" aria-labelledby="privacy-no-title">
        <CircleSlash2Icon aria-hidden="true" />
        <div>
          <h2 id="privacy-no-title">What Public Parish does not collect</h2>
          <p>
            Public Parish does not request an exact home address, sell resident
            data, run advertising profiles, or publish account records and Ask
            threads. Reading public records does not require sign-in.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="privacy-processors-title"
        className="privacy-processors"
      >
        <div className="privacy-section-heading">
          <Share2Icon aria-hidden="true" />
          <div>
            <h2 id="privacy-processors-title">Who processes the data</h2>
            <p>
              Convex hosts the application, account data, saved setup, and Ask
              threads. Google provides sign-in. OpenAI processes Ask questions
              and the selected official evidence through Convex AI Gateway to
              produce an answer. Public Parish does not send your Google email
              to OpenAI as part of Ask. AgentMail receives messages you choose
              to send to the project inbox.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="privacy-controls-title"
        className="privacy-controls"
      >
        <div>
          <h2 id="privacy-controls-title">Your controls</h2>
          <ul>
            <li>Use reading and Ask without a Google account.</li>
            <li>Remove saved areas and topics from your account page.</li>
            <li>
              Clear this site's browser storage to remove the local area,
              anonymous Ask handle, and analytics identifier from that browser.
            </li>
            <li>
              Request access to or deletion of your account data by email.
            </li>
          </ul>
        </div>
        <div className="privacy-contact">
          <MailIcon aria-hidden="true" />
          <div>
            <h3>Privacy questions and deletion requests</h3>
            <p>
              Email the project inbox. Include the Google email tied to the
              account, but never send a password or sign-in code.
            </p>
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          </div>
        </div>
      </section>
    </main>
  )
}
