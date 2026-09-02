import {
  CheckIcon,
  CircleAlertIcon,
  MailIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useAction } from 'convex/react'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'
import { Button } from '../../components/ui/button'
import { ResidentStandalone } from '../resident-blueprint/resident-shell'
import type { DeliveryFrequency, FollowedTarget } from './contracts'
import { FrequencyOptions } from './follow-action'
import type { EmailManagementData } from './following-page.data'

import './following.css'

type EmailManagementActions = {
  remove: () => Promise<unknown>
  update: (cadence: DeliveryFrequency | 'muted') => Promise<unknown>
}

export function LiveEmailManagementPage({ token }: { token: string }) {
  const getManagement = useAction(api.follows.management.getEmailManagement)
  const updateFollow = useAction(api.follows.management.updateEmailFollow)
  const removeFollow = useAction(api.follows.management.removeEmailFollow)
  const rotateToken = useAction(
    api.follows.management.rotateEmailManagementToken,
  )
  const [activeToken, setActiveToken] = useState(token)
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof getManagement>> | undefined
  >()

  useEffect(() => {
    let current = true
    void getManagement({ token: activeToken })
      .then((next) => {
        if (current) setResult(next)
      })
      .catch(() => {
        if (current) setResult({ status: 'unavailable' })
      })
    return () => {
      current = false
    }
  }, [activeToken, getManagement])

  if (!result) {
    return (
      <ResidentStandalone>
        <main className="email-manage-page" id="resident-main">
          <section aria-live="polite" className="email-expired" role="status">
            <MailIcon aria-hidden="true" />
            <p className="following-kicker">Email-only follow</p>
            <h1>Checking this management link</h1>
            <p>Public Parish is checking the link without signing you in.</p>
          </section>
        </main>
      </ResidentStandalone>
    )
  }

  if (result.status !== 'valid') {
    return (
      <EmailManagementPage
        data={{
          available: true,
          managementState: result.status,
        }}
      />
    )
  }

  const subscription = toEmailManagedTarget(result.follow)
  const rotate = async () => {
    const next = await rotateToken({ token: activeToken })
    setActiveToken(next.token)
    window.history.replaceState(
      window.history.state,
      '',
      `/email/manage/${encodeURIComponent(next.token)}`,
    )
  }
  const actions: EmailManagementActions = {
    remove: () => removeFollow({ token: activeToken }),
    update: async (cadence) => {
      await updateFollow({ token: activeToken, cadence })
      await rotate()
    },
  }

  return (
    <EmailManagementPage
      actions={actions}
      data={{ available: true, scenario: 'valid', subscription }}
    />
  )
}

export function EmailManagementPage({
  actions,
  data,
}: {
  actions?: EmailManagementActions
  data: EmailManagementData
}) {
  const subscription = data.subscription
  return (
    <ResidentStandalone>
      <main className="email-manage-page" id="resident-main">
        {data.available && data.scenario === 'valid' && subscription ? (
          <ValidEmailManagement actions={actions} subscription={subscription} />
        ) : data.available &&
          data.scenario === 'delivery-failure' &&
          subscription ? (
          <ValidEmailManagement
            actions={actions}
            deliveryFailed
            subscription={subscription}
          />
        ) : (
          <ExpiredEmailManagement
            allowFixtureRetry={data.scenario === 'expired'}
            reason={
              data.managementState ??
              (!data.available ? 'not-ready' : 'expired')
            }
          />
        )}
      </main>
    </ResidentStandalone>
  )
}

function ValidEmailManagement({
  actions,
  deliveryFailed = false,
  subscription,
}: {
  actions?: EmailManagementActions
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const saveCadence = async (cadence: DeliveryFrequency | 'muted') => {
    setBusy(true)
    setError('')
    try {
      if (actions) await actions.update(cadence)
      setSaved(true)
      return true
    } catch {
      setError('That change could not be saved. Try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      if (actions) await actions.remove()
      setRemoved(true)
    } catch {
      setError('This follow could not be removed. Try again.')
    } finally {
      setBusy(false)
    }
  }

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
          <Button
            disabled={busy}
            onClick={() =>
              void saveCadence(frequency).then((updated) => {
                if (updated) setMuted(false)
              })
            }
            size="touch"
          >
            {busy
              ? 'Saving...'
              : muted
                ? 'Save schedule and resume'
                : 'Save delivery schedule'}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              const nextMuted = !muted
              void saveCadence(nextMuted ? 'muted' : frequency).then(
                (updated) => {
                  if (updated) setMuted(nextMuted)
                },
              )
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
          {error
            ? error
            : saved
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
              disabled={busy}
              onClick={() => void remove()}
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

function ExpiredEmailManagement({
  allowFixtureRetry,
  reason,
}: {
  allowFixtureRetry: boolean
  reason: 'expired' | 'not-ready' | 'unavailable'
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <section className="email-expired">
      <CircleAlertIcon aria-hidden="true" />
      <p className="following-kicker">Email-only follow</p>
      <h1>
        {reason === 'not-ready'
          ? 'This management link is not active yet.'
          : reason === 'unavailable'
            ? 'This management link is unavailable.'
            : 'This management link expired.'}
      </h1>
      <p>
        {reason === 'not-ready'
          ? 'Email-only subscription management will open after verified delivery is connected.'
          : reason === 'unavailable'
            ? 'The link may have been replaced or the follow may have been removed.'
            : 'Use Explore to find the target again, then start a new email-only follow. A new short-lived code will verify the address without creating an account.'}
      </p>
      {reason !== 'expired' || !allowFixtureRetry ? (
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

export function toEmailManagedTarget(follow: {
  cadence: DeliveryFrequency | 'muted'
  createdAt: number
  detail: string
  id: string
  resumeCadence: DeliveryFrequency
  targetKey: string
  targetKind: 'issue' | 'topic' | 'government_body' | 'place'
  title: string
}): FollowedTarget {
  const kind = {
    issue: 'Issue',
    topic: 'Topic',
    government_body: 'Government body',
    place: 'Place',
  } as const
  return {
    destination: 'Verified email',
    detail: follow.detail,
    frequency: follow.resumeCadence,
    id: follow.id,
    key: follow.targetKey,
    kind: kind[follow.targetKind],
    latestChange: 'Managed through this private link',
    status: follow.cadence === 'muted' ? 'Muted' : 'Following',
    title: follow.title,
  }
}
