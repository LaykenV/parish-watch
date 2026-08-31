import {
  CheckIcon,
  CircleAlertIcon,
  MailIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { ResidentStandalone } from '../resident-blueprint/resident-shell'
import type { DeliveryFrequency, FollowedTarget } from './contracts'
import { FrequencyOptions } from './follow-action'
import type { EmailManagementData } from './following-page.data'

import './following.css'

export function EmailManagementPage({ data }: { data: EmailManagementData }) {
  const subscription = data.subscription
  return (
    <ResidentStandalone>
      <main className="email-manage-page" id="resident-main">
        {data.available && data.scenario === 'valid' && subscription ? (
          <ValidEmailManagement subscription={subscription} />
        ) : data.available &&
          data.scenario === 'delivery-failure' &&
          subscription ? (
          <ValidEmailManagement deliveryFailed subscription={subscription} />
        ) : (
          <ExpiredEmailManagement unavailable={!data.available} />
        )}
      </main>
    </ResidentStandalone>
  )
}

function ValidEmailManagement({
  deliveryFailed = false,
  subscription,
}: {
  deliveryFailed?: boolean
  subscription: FollowedTarget
}) {
  const [frequency, setFrequency] = useState<DeliveryFrequency>(
    subscription.frequency,
  )
  const [muted, setMuted] = useState(subscription.status === 'Muted')
  const [saved, setSaved] = useState(false)
  const [unfollowing, setUnfollowing] = useState(false)
  const [removed, setRemoved] = useState(false)

  if (removed) {
    return (
      <section aria-live="polite" className="email-manage-result">
        <span>
          <CheckIcon aria-hidden="true" />
        </span>
        <p className="following-kicker">Email-only follow</p>
        <h1>Unfollowed.</h1>
        <p>
          Public Parish will no longer send updates about this issue to{' '}
          {subscription.destination}.
        </p>
        <Button render={<Link to="/explore" />} size="touch">
          Browse current issues
        </Button>
      </section>
    )
  }

  return (
    <>
      <header className="following-head email-manage-head">
        <p className="following-kicker">Email-only follow</p>
        <h1>Manage this follow</h1>
        <p>
          This secure page changes one subscription. It does not create an
          account or reveal any other follows.
        </p>
      </header>

      {deliveryFailed ? (
        <div className="email-delivery-warning" role="status">
          <CircleAlertIcon aria-hidden="true" />
          <div>
            <strong>Delivery needs attention</strong>
            <p>
              The last email could not be delivered. Update the destination by
              verifying a new code, or keep this follow muted.
            </p>
          </div>
        </div>
      ) : null}

      <section
        className="email-manage-card"
        aria-labelledby="subscription-title"
      >
        <div className="email-manage-identity">
          <MailIcon aria-hidden="true" />
          <div>
            <p className="following-count">Issue</p>
            <h2 id="subscription-title">{subscription.title}</h2>
            <p>{subscription.detail}</p>
          </div>
        </div>
        <dl className="email-manage-ledger">
          <div>
            <dt>Destination</dt>
            <dd>{subscription.destination}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{muted ? 'Muted' : 'Following'}</dd>
          </div>
        </dl>

        <fieldset className="follow-fieldset">
          <legend>Delivery schedule</legend>
          <FrequencyOptions
            onChange={(value) => {
              setFrequency(value)
              setSaved(false)
            }}
            value={frequency}
          />
        </fieldset>
        <div className="email-manage-actions">
          <Button onClick={() => setSaved(true)} size="touch">
            Save delivery schedule
          </Button>
          <Button
            onClick={() => {
              setMuted((current) => !current)
              setSaved(false)
            }}
            size="touch"
            variant="outline"
          >
            {muted ? (
              <Volume2Icon aria-hidden="true" />
            ) : (
              <VolumeXIcon aria-hidden="true" />
            )}
            {muted ? 'Resume delivery' : 'Mute delivery'}
          </Button>
        </div>
        <p aria-live="polite" className="email-manage-status">
          {saved
            ? 'Delivery schedule saved.'
            : 'Only you can manage these settings.'}
        </p>
      </section>

      <section
        className="email-unfollow"
        aria-labelledby="email-unfollow-title"
      >
        <div>
          <h2 id="email-unfollow-title">Unfollow this issue</h2>
          <p>This removes only this email subscription.</p>
        </div>
        {unfollowing ? (
          <div
            className="email-unfollow-confirm"
            role="group"
            aria-label="Confirm unfollow"
          >
            <p>Stop all updates for this issue?</p>
            <Button
              onClick={() => setRemoved(true)}
              size="touch"
              variant="destructive-outline"
            >
              Unfollow this issue
            </Button>
            <Button
              onClick={() => setUnfollowing(false)}
              size="touch"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setUnfollowing(true)}
            size="touch"
            variant="outline"
          >
            Unfollow
          </Button>
        )}
      </section>
    </>
  )
}

function ExpiredEmailManagement({ unavailable }: { unavailable: boolean }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <section className="email-expired">
      <CircleAlertIcon aria-hidden="true" />
      <p className="following-kicker">Email-only follow</p>
      <h1>
        {unavailable
          ? 'This management link is not active yet.'
          : 'This management link expired.'}
      </h1>
      <p>
        {unavailable
          ? 'Email-only subscription management will open after verified delivery is connected.'
          : 'Verify another short-lived code to manage this one subscription. This does not create a user session.'}
      </p>
      {unavailable ? (
        <Button render={<Link to="/explore" />} size="touch">
          Explore published records
        </Button>
      ) : sent ? (
        <div aria-live="polite" className="email-expired-sent">
          <CheckIcon aria-hidden="true" />
          <p>A new code was sent to {email}. It expires in 10 minutes.</p>
        </div>
      ) : (
        <form
          className="follow-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (email) setSent(true)
          }}
        >
          <label className="follow-input-label" htmlFor="manage-email">
            Email address for this follow
          </label>
          <input
            className="follow-input"
            id="manage-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <Button size="touch" type="submit">
            Send a new code
          </Button>
        </form>
      )}
    </section>
  )
}
