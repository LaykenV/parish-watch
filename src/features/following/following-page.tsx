import {
  BellRingIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  EllipsisIcon,
  MailIcon,
  MapPinIcon,
  PlusIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
import { Sheet } from '../discovery/sheet'
import type {
  DeliveryFrequency,
  FollowKind,
  FollowedTarget,
  FollowingScenario,
} from './contracts'
import { frequencyLabel } from './contracts'
import { FrequencyOptions } from './follow-action'
import type { FollowingPageData, SavedArea } from './following-page.data'

import './following.css'

export type FollowingView = 'following' | 'areas' | 'notifications'

const VIEW_LABELS: Record<FollowingView, string> = {
  following: 'Following',
  areas: 'Areas and topics',
  notifications: 'Notifications',
}

const VIEW_PATHS = {
  following: '/following',
  areas: '/following/areas-and-topics',
  notifications: '/following/notifications',
} as const satisfies Record<FollowingView, string>

export function FollowingPage({
  data,
  view,
}: {
  data: FollowingPageData
  view: FollowingView
}) {
  if (!data.available) return <FollowingUnavailable />
  if (!data.signedIn) return <FollowingSignedOut scenario={data.scenario} />

  return (
    <main className="following-page" id="resident-main">
      <header className="following-head">
        <p className="following-kicker">Your Public Parish</p>
        <h1>{VIEW_LABELS[view]}</h1>
        <p>
          {view === 'following'
            ? 'Every target, delivery schedule, and destination you manage.'
            : view === 'areas'
              ? 'Saved interests shape For You. Explore filters stay temporary.'
              : 'Choose when useful changes reach you. Empty roundups are never sent.'}
        </p>
      </header>

      <FollowingNavigation scenario={data.scenario} view={view} />

      {view === 'following' ? <FollowingList data={data} /> : null}
      {view === 'areas' ? <AreasAndTopics data={data} /> : null}
      {view === 'notifications' ? <Notifications /> : null}
    </main>
  )
}

function FollowingUnavailable() {
  return (
    <main className="following-page" id="resident-main">
      <header className="following-head">
        <p className="following-kicker">Following</p>
        <h1>Updates are not available yet</h1>
        <p>
          Public Parish is finishing account ownership and verified email
          delivery before it accepts follows.
        </p>
      </header>
      <section
        className="following-unavailable"
        aria-labelledby="follow-read-title"
      >
        <BellRingIcon aria-hidden="true" />
        <div>
          <h2 id="follow-read-title">
            You can still read every published record.
          </h2>
          <p>
            Browse decisions and inspect their official sources without an
            account. No alert or saved preference is created from this page.
          </p>
          <Button render={<Link to="/explore" />} size="touch">
            Explore published records
          </Button>
        </div>
      </section>
    </main>
  )
}

function FollowingSignedOut({ scenario }: { scenario?: FollowingScenario }) {
  const [googleComplete, setGoogleComplete] = useState(false)

  if (googleComplete) {
    return (
      <main className="following-page" id="resident-main">
        <div aria-live="polite" className="following-return">
          <span>
            <CheckIcon aria-hidden="true" />
          </span>
          <p className="following-kicker">Google sign-in complete</p>
          <h1>Your saved updates are ready.</h1>
          <p>
            Public Parish returned you to Following. The action that started
            sign-in can now finish without losing its target or schedule.
          </p>
          <Button
            render={<Link search={{ fixture: 'active' }} to="/following" />}
            size="touch"
          >
            Open Following
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="following-page" id="resident-main">
      <header className="following-head">
        <p className="following-kicker">Following</p>
        <h1>Keep track of what changes</h1>
        <p>
          Google manages a full following list. Email-only links manage one
          verified subscription without creating an account.
        </p>
      </header>
      <div className="following-entry-grid">
        <section className="following-entry-card">
          <p className="following-entry-label">Full dashboard</p>
          <h2>Continue with Google</h2>
          <p>
            Save several issues, places, and topics. Manage them together from
            this page.
          </p>
          <Button onClick={() => setGoogleComplete(true)} size="touch">
            Continue with Google
          </Button>
        </section>
        <section className="following-entry-card">
          <p className="following-entry-label">One subscription</p>
          <h2>Use email only</h2>
          <p>
            Start from a Follow button. Verify a code, then manage that follow
            through its private email link.
          </p>
          <Button
            render={<Link to="/explore" />}
            size="touch"
            variant="outline"
          >
            Find something to follow
          </Button>
        </section>
      </div>
      <p className="following-private-note">
        Reading, search, and Ask never require an account.
      </p>
      <span className="visually-hidden">Fixture state: {scenario}</span>
    </main>
  )
}

function FollowingNavigation({
  scenario,
  view,
}: {
  scenario?: FollowingScenario
  view: FollowingView
}) {
  const navigate = useNavigate()
  return (
    <>
      <nav aria-label="Following views" className="following-tabs">
        {(Object.keys(VIEW_LABELS) as FollowingView[]).map((item) => (
          <Link
            aria-current={view === item ? 'page' : undefined}
            data-active={view === item ? '' : undefined}
            key={item}
            search={{ fixture: scenario }}
            to={VIEW_PATHS[item]}
          >
            {VIEW_LABELS[item]}
          </Link>
        ))}
      </nav>
      <label className="following-view-select">
        <span>View</span>
        <span className="following-select-control">
          <select
            onChange={(event) =>
              void navigate({
                search: { fixture: scenario },
                to: VIEW_PATHS[event.target.value as FollowingView],
              })
            }
            value={view}
          >
            {(Object.keys(VIEW_LABELS) as FollowingView[]).map((item) => (
              <option key={item} value={item}>
                {VIEW_LABELS[item]}
              </option>
            ))}
          </select>
          <ChevronDownIcon aria-hidden="true" />
        </span>
      </label>
    </>
  )
}

function FollowingList({ data }: { data: FollowingPageData }) {
  const [targets, setTargets] = useState(data.targets)
  const [filter, setFilter] = useState<'All' | FollowKind>('All')
  const [selected, setSelected] = useState<FollowedTarget | null>(null)
  const [undo, setUndo] = useState<FollowedTarget | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  const shown = useMemo(
    () =>
      filter === 'All'
        ? targets
        : targets.filter((target) => target.kind === filter),
    [filter, targets],
  )

  const updateTarget = (next: FollowedTarget) => {
    setTargets((current) =>
      current.map((target) => (target.id === next.id ? next : target)),
    )
    setSelected(next)
  }

  const unfollow = (target: FollowedTarget) => {
    setTargets((current) => current.filter((item) => item.id !== target.id))
    setUndo(target)
    setSelected(null)
  }

  return (
    <section className="following-section" aria-labelledby="followed-title">
      <div className="following-section-head">
        <div>
          <p className="following-count">{targets.length} followed targets</p>
          <h2 id="followed-title">Latest changes first</h2>
        </div>
        <Button render={<Link to="/explore" />} size="touch" variant="outline">
          <PlusIcon aria-hidden="true" />
          Find an issue
        </Button>
      </div>

      <div aria-label="Filter follows" className="following-filters">
        {(['All', 'Issue', 'Topic', 'Government body', 'Place'] as const).map(
          (item) => (
            <button
              aria-pressed={filter === item}
              data-selected={filter === item ? '' : undefined}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item === 'Government body'
                ? 'Bodies'
                : `${item}${item === 'All' ? '' : 's'}`}
            </button>
          ),
        )}
      </div>

      {undo ? (
        <div aria-live="polite" className="following-undo">
          <span>Unfollowed {undo.title}.</span>
          <button
            onClick={() => {
              setTargets((current) => [undo, ...current])
              setUndo(null)
            }}
            type="button"
          >
            Undo
          </button>
        </div>
      ) : null}

      {shown.length > 0 ? (
        <ol className="following-list">
          {shown.map((target) => (
            <FollowRow
              key={target.id}
              onManage={() => setSelected(target)}
              returnTo={`/following?fixture=${data.scenario ?? 'active'}`}
              target={target}
            />
          ))}
        </ol>
      ) : (
        <div className="following-empty">
          <h3>
            {targets.length === 0
              ? 'Nothing followed yet'
              : `No ${filter.toLowerCase()} follows`}
          </h3>
          <p>
            {targets.length === 0
              ? 'Open a current issue and choose Follow to get material updates.'
              : 'Choose another filter to see the rest of your follows.'}
          </p>
          {targets.length === 0 ? (
            <Button render={<Link to="/explore" />} size="touch">
              Browse current issues
            </Button>
          ) : null}
        </div>
      )}

      {targets.length > 0 ? (
        <div className="following-danger-zone">
          <div>
            <h3>Unfollow all</h3>
            <p>This removes every target. It does not delete your account.</p>
          </div>
          {confirmAll ? (
            <div
              className="following-confirm-all"
              role="group"
              aria-label="Confirm unfollow all"
            >
              <p>Remove all {targets.length} follows?</p>
              <Button
                onClick={() => {
                  setTargets([])
                  setConfirmAll(false)
                }}
                size="touch"
                variant="destructive-outline"
              >
                Unfollow all {targets.length}
              </Button>
              <Button
                onClick={() => setConfirmAll(false)}
                size="touch"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setConfirmAll(true)}
              size="touch"
              variant="outline"
            >
              Unfollow all
            </Button>
          )}
        </div>
      ) : null}

      <ManageFollowSheet
        key={selected?.id ?? 'closed'}
        onChange={updateTarget}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onUnfollow={unfollow}
        target={selected}
      />
    </section>
  )
}

function FollowRow({
  onManage,
  returnTo,
  target,
}: {
  onManage: () => void
  returnTo: string
  target: FollowedTarget
}) {
  return (
    <li
      className="following-row"
      data-muted={target.status === 'Muted' ? '' : undefined}
    >
      <div className="following-row-kind">
        <span>{target.kind}</span>
        <span className="following-row-status" data-status={target.status}>
          {target.status === 'Muted' ? (
            <VolumeXIcon aria-hidden="true" />
          ) : (
            <Volume2Icon aria-hidden="true" />
          )}
          {target.status}
        </span>
      </div>
      <div className="following-row-main">
        <h3>{target.title}</h3>
        <p>{target.detail}</p>
      </div>
      <dl className="following-row-ledger">
        <div>
          <dt>Latest change</dt>
          <dd>
            {target.latestChange}
            {target.href ? (
              <Link
                className="following-row-open"
                search={{
                  fixture: target.evidenceScenario,
                  returnTo,
                }}
                to={target.href}
              >
                {target.evidenceScenario === 'update'
                  ? 'Open changed issue'
                  : 'Open issue'}
              </Link>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Next date</dt>
          <dd>{target.nextDate ?? 'No next date posted'}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{frequencyLabel(target.frequency)}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{target.destination}</dd>
        </div>
      </dl>
      {target.coverage ? (
        <div className="following-coverage-warning">
          <CircleAlertIcon aria-hidden="true" />
          <p>
            <strong>{target.coverage.label}</strong>
            <span>{target.coverage.note}</span>
          </p>
        </div>
      ) : null}
      <Button
        aria-label={`Manage ${target.title}`}
        id={`follow-manage-${target.id}`}
        onClick={onManage}
        size="touch"
        variant="outline"
      >
        <EllipsisIcon aria-hidden="true" />
        Manage
      </Button>
    </li>
  )
}

function ManageFollowSheet({
  onChange,
  onOpenChange,
  onUnfollow,
  target,
}: {
  onChange: (target: FollowedTarget) => void
  onOpenChange: (open: boolean) => void
  onUnfollow: (target: FollowedTarget) => void
  target: FollowedTarget | null
}) {
  const [frequency, setFrequency] = useState<DeliveryFrequency>(
    target?.frequency ?? 'immediate',
  )

  const handleOpen = (open: boolean) => {
    onOpenChange(open)
  }

  return (
    <Sheet
      description={target ? `${target.kind} · ${target.detail}` : undefined}
      onOpenChange={handleOpen}
      open={Boolean(target)}
      popupId="manage-follow-dialog"
      size="tall"
      title={target ? `Manage ${target.title}` : 'Manage follow'}
      triggerId={target ? `follow-manage-${target.id}` : 'follow-manage-none'}
    >
      {target ? (
        <div className="manage-follow">
          <div className="manage-destination">
            <span>Destination</span>
            <strong>{target.destination}</strong>
          </div>
          <fieldset className="follow-fieldset">
            <legend>Delivery schedule</legend>
            <FrequencyOptions onChange={setFrequency} value={frequency} />
          </fieldset>
          <Button
            onClick={() => onChange({ ...target, frequency })}
            size="touch"
          >
            Save delivery schedule
          </Button>
          <div className="manage-follow-secondary">
            <Button
              onClick={() =>
                onChange({
                  ...target,
                  status: target.status === 'Muted' ? 'Following' : 'Muted',
                })
              }
              size="touch"
              variant="outline"
            >
              {target.status === 'Muted' ? (
                <Volume2Icon aria-hidden="true" />
              ) : (
                <VolumeXIcon aria-hidden="true" />
              )}
              {target.status === 'Muted' ? 'Resume delivery' : 'Mute delivery'}
            </Button>
            <Button
              onClick={() => onUnfollow(target)}
              size="touch"
              variant="destructive-outline"
            >
              Unfollow this {target.kind.toLowerCase()}
            </Button>
          </div>
          <p className="following-private-note">
            Only you can manage these settings.
          </p>
        </div>
      ) : null}
    </Sheet>
  )
}

function AreasAndTopics({ data }: { data: FollowingPageData }) {
  const addAreaButtonRef = useRef<HTMLButtonElement>(null)
  const [areas, setAreas] = useState(data.areas)
  const [areaAction, setAreaAction] = useState<
    { mode: 'add' } | { area: SavedArea; mode: 'manage' } | null
  >(null)
  const [topics, setTopics] = useState(new Set(data.topics))
  const [saved, setSaved] = useState(false)
  const [areaStatus, setAreaStatus] = useState('')
  const availableArea = areas.some((area) => area.name === 'Rapides Parish')
    ? null
    : {
        detail: 'Follow current decisions and meetings',
        name: 'Rapides Parish',
      }
  const selectedArea =
    areaAction?.mode === 'manage' ? areaAction.area : undefined
  const options = [
    'Public money',
    'Public assets',
    'Drainage',
    'Land use',
    'Housing',
  ]

  return (
    <div className="following-preferences">
      <section
        className="following-section"
        aria-labelledby="saved-areas-title"
      >
        <div className="following-section-head">
          <div>
            <p className="following-count">No street address needed</p>
            <h2 id="saved-areas-title">Saved areas</h2>
          </div>
          <Button
            id="add-saved-area"
            onClick={() => {
              setAreaStatus('')
              setAreaAction({ mode: 'add' })
            }}
            ref={addAreaButtonRef}
            size="touch"
            variant="outline"
          >
            <MapPinIcon aria-hidden="true" />
            Add area
          </Button>
        </div>
        <ul className="following-simple-list">
          {areas.map((area) => (
            <li key={area.name}>
              <div>
                <strong>{area.name}</strong>
                <span>{area.detail}</span>
              </div>
              <Button
                aria-label={`Manage ${area.name}`}
                id={`manage-saved-area-${area.name.toLowerCase().replaceAll(' ', '-')}`}
                onClick={() => {
                  setAreaStatus('')
                  setAreaAction({ area, mode: 'manage' })
                }}
                size="touch"
                variant="ghost"
              >
                Manage
              </Button>
            </li>
          ))}
        </ul>
        <p className="following-inline-note">
          Not seeing your area?{' '}
          <Link to="/coverage/request">Request coverage.</Link>
        </p>
        {areaStatus ? (
          <p aria-live="polite" className="following-area-status">
            {areaStatus}
          </p>
        ) : null}
        <Sheet
          description={
            selectedArea
              ? 'Change one saved area without affecting your other interests.'
              : 'Save a launch area to shape For You. No street address is needed.'
          }
          onOpenChange={(open) => {
            if (!open) setAreaAction(null)
          }}
          open={Boolean(areaAction)}
          popupId="saved-area-dialog"
          size="tall"
          title={
            selectedArea ? `Manage ${selectedArea.name}` : 'Add a saved area'
          }
          triggerId={
            selectedArea
              ? `manage-saved-area-${selectedArea.name.toLowerCase().replaceAll(' ', '-')}`
              : 'add-saved-area'
          }
        >
          {selectedArea ? (
            <div className="manage-follow manage-saved-area">
              <div className="manage-destination">
                <span>Saved area</span>
                <strong>{selectedArea.name}</strong>
              </div>
              <p>
                {selectedArea.detail}. Removing it changes For You but does not
                remove any separately followed issue.
              </p>
              <Button
                onClick={() => {
                  const name = selectedArea.name
                  setAreas((current) =>
                    current.filter((area) => area.name !== name),
                  )
                  setAreaStatus(`${name} removed from saved areas.`)
                  setAreaAction(null)
                  setTimeout(() => addAreaButtonRef.current?.focus(), 0)
                }}
                size="touch"
                variant="destructive-outline"
              >
                Remove saved area
              </Button>
            </div>
          ) : areaAction?.mode === 'add' ? (
            <div className="manage-follow manage-saved-area">
              {availableArea ? (
                <>
                  <div className="manage-destination">
                    <span>Available launch area</span>
                    <strong>{availableArea.name}</strong>
                  </div>
                  <p>{availableArea.detail}. No street address is collected.</p>
                  <Button
                    onClick={() => {
                      setAreas((current) => [...current, availableArea])
                      setAreaStatus(
                        `${availableArea.name} added to saved areas.`,
                      )
                      setAreaAction(null)
                    }}
                    size="touch"
                  >
                    Save {availableArea.name}
                  </Button>
                </>
              ) : (
                <p>All currently supported launch areas are already saved.</p>
              )}
              <p className="following-private-note">
                Need another place? Use Request coverage so unsupported areas
                are never presented as active coverage.
              </p>
            </div>
          ) : null}
        </Sheet>
      </section>

      <section
        className="following-section"
        aria-labelledby="saved-topics-title"
      >
        <div className="following-section-head">
          <div>
            <p className="following-count">Optional</p>
            <h2 id="saved-topics-title">Topics</h2>
          </div>
        </div>
        <fieldset className="following-topic-grid">
          <legend className="visually-hidden">Choose saved topics</legend>
          {options.map((topic) => (
            <label key={topic}>
              <input
                checked={topics.has(topic)}
                onChange={() => {
                  setSaved(false)
                  setTopics((current) => {
                    const next = new Set(current)
                    if (next.has(topic)) next.delete(topic)
                    else next.add(topic)
                    return next
                  })
                }}
                type="checkbox"
              />
              <span>{topic}</span>
            </label>
          ))}
        </fieldset>
        <div className="following-save-row">
          <Button onClick={() => setSaved(true)} size="touch">
            Save interests
          </Button>
          <p aria-live="polite">
            {saved ? 'Saved.' : 'These choices affect For You.'}
          </p>
        </div>
      </section>
    </div>
  )
}

function Notifications() {
  const [frequency, setFrequency] = useState<DeliveryFrequency>('both')
  const [saved, setSaved] = useState(false)

  return (
    <div className="following-notifications">
      <section
        className="following-section following-schedule"
        aria-labelledby="delivery-title"
      >
        <div className="following-section-head">
          <div>
            <p className="following-count">Default for new follows</p>
            <h2 id="delivery-title">Delivery schedule</h2>
          </div>
        </div>
        <fieldset className="follow-fieldset">
          <legend className="visually-hidden">Default delivery schedule</legend>
          <FrequencyOptions
            onChange={(value) => {
              setFrequency(value)
              setSaved(false)
            }}
            value={frequency}
          />
        </fieldset>
        <div className="following-save-row">
          <Button onClick={() => setSaved(true)} size="touch">
            Save notification settings
          </Button>
          <p aria-live="polite">
            {saved
              ? 'Notification settings saved.'
              : 'Existing follows keep their own schedule.'}
          </p>
        </div>
      </section>

      <section
        className="following-section"
        aria-labelledby="email-examples-title"
      >
        <div className="following-section-head">
          <div>
            <p className="following-count">What residents receive</p>
            <h2 id="email-examples-title">Alert examples</h2>
          </div>
        </div>
        <div className="notification-preview-grid">
          <EmailPreview kind="immediate" />
          <EmailPreview kind="roundup" />
        </div>
      </section>
    </div>
  )
}

function EmailPreview({ kind }: { kind: 'immediate' | 'roundup' }) {
  const immediate = kind === 'immediate'
  return (
    <article className="notification-preview">
      <header>
        <MailIcon aria-hidden="true" />
        <div>
          <p>{immediate ? 'Immediate material update' : 'Weekly roundup'}</p>
          <h3>
            {immediate
              ? 'Public Parish update: [Issue title]'
              : 'Your Public Parish week'}
          </h3>
        </div>
      </header>
      {immediate ? (
        <ol>
          <li>
            <strong>What changed</strong>
            <span>One factual sentence from validated evidence.</span>
          </li>
          <li>
            <strong>Current state or next date</strong>
            <span>The resident can act on the timing.</span>
          </li>
          <li>
            <strong>Why it may matter</strong>
            <span>The consequence stays tied to accepted evidence.</span>
          </li>
          <li>
            <strong>Official sources</strong>
            <span>Receipts stay attached.</span>
          </li>
        </ol>
      ) : (
        <div className="roundup-preview">
          <p>
            <strong>[Followed place]</strong>
            <span>
              Outcomes and deadlines appear before lower-priority changes.
            </span>
          </p>
          <p>
            <strong>[Followed issue]</strong>
            <span>Only material changes are included.</span>
          </p>
          <p className="roundup-rule">No changes means no email.</p>
        </div>
      )}
      <footer>
        <span>Open in Public Parish</span>
        <span>Reply with a question</span>
        <span>Manage delivery</span>
      </footer>
    </article>
  )
}
