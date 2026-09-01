import {
  CircleUserRoundIcon,
  ListFilterIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  SearchIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'

import { AreaSelector } from '../discovery/area-selector'
import { useArea } from '../discovery/area-store'
import { areaName } from '../discovery/contracts'
import { useKeyboardOpen, useOnline, useOverlayOpen } from '../discovery/hooks'

import { Spinner } from '../../components/ui/spinner'
import { LOUISIANA_OUTLINE_PATH } from '../landing/louisiana-path'

import './resident-blueprint.css'
import '../discovery/discovery.css'

type NavigationItem = {
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
}

const PRIMARY_NAVIGATION: NavigationItem[] = [
  { href: '/for-you', icon: ListFilterIcon, label: 'For You' },
  { href: '/explore', icon: SearchIcon, label: 'Explore' },
  { href: '/ask', icon: MessageCircleQuestionIcon, label: 'Ask' },
  { href: '/coverage', icon: LouisianaIcon, label: 'Coverage' },
]

const STATIC_ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/ask': 'Ask Public Parish',
  '/coverage': 'Coverage',
  '/coverage/request': 'Request coverage',
  '/explore': 'Explore',
  '/following': 'Following',
  '/following/areas-and-topics': 'Areas and topics',
  '/following/notifications': 'Notifications',
  '/for-you': 'For You',
  '/how-it-works': 'How Public Parish works',
  '/issues': 'Issues',
}

export function residentRouteLabel(pathname: string): string {
  const staticLabel = STATIC_ROUTE_LABELS[pathname]
  if (staticLabel) return staticLabel
  if (pathname.startsWith('/decisions/')) return 'Decision record'
  if (pathname.startsWith('/email/manage/')) return 'Manage this follow'
  if (pathname.startsWith('/issues/')) return 'Issue'
  if (pathname.startsWith('/meetings/')) return 'Meeting'
  return 'Page'
}

export function ResidentRouteAccessibility() {
  const { isLoading, pathname } = useRouterState({
    select: (state) => ({
      isLoading: state.isLoading,
      pathname: state.location.pathname,
    }),
  })
  const previousPath = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (isLoading) return

    const fallbackLabel = residentRouteLabel(pathname)
    let innerFrame = 0
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>('#resident-main h1')
        const headingText = heading?.textContent.trim()
        document.title = headingText
          ? `${headingText} | Public Parish`
          : `${fallbackLabel} | Public Parish`

        if (
          previousPath.current !== null &&
          previousPath.current !== pathname
        ) {
          // Moving focus to the heading already reads it aloud. Announcing the
          // same text again would say the page name twice, so the live region
          // only speaks when there is no heading to land on.
          if (heading) {
            heading.setAttribute('tabindex', '-1')
            heading.addEventListener(
              'blur',
              () => heading.removeAttribute('tabindex'),
              { once: true },
            )
            heading.focus({ preventScroll: true })
            setAnnouncement('')
          } else {
            setAnnouncement(`${fallbackLabel} page loaded.`)
          }
        }
        previousPath.current = pathname
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(innerFrame)
    }
  }, [isLoading, pathname])

  return (
    <p
      aria-atomic="true"
      aria-live="polite"
      className="visually-hidden"
      role="status"
    >
      {announcement}
    </p>
  )
}

function LouisianaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 260 240" {...props}>
      <path
        d={LOUISIANA_OUTLINE_PATH}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="14"
      />
    </svg>
  )
}

export function RouteLoadingRegion() {
  const isLoading = useRouterState({ select: (state) => state.isLoading })

  return (
    <div
      aria-atomic="true"
      aria-busy={isLoading}
      className="route-loading-region"
      role="status"
    >
      {isLoading ? (
        <>
          <Spinner aria-hidden="true" />
          <span className="visually-hidden">Loading page</span>
        </>
      ) : null}
    </div>
  )
}

export function ResidentShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const area = useArea()
  const keyboardOpen = useKeyboardOpen()
  const overlayOpen = useOverlayOpen()
  const online = useOnline()

  return (
    <div
      className="resident-blueprint"
      data-keyboard-open={keyboardOpen ? '' : undefined}
      data-offline={online ? undefined : ''}
      data-overlay-open={overlayOpen ? '' : undefined}
    >
      <a className="resident-skip-link" href="#resident-main">
        Skip to content
      </a>

      <header className="resident-header">
        <div className="resident-header-inner">
          <Link
            aria-current={pathname === '/' ? 'page' : undefined}
            className="resident-brand"
            to="/"
            aria-label="Public Parish home"
          >
            <img src="/brand-mark.svg" alt="" width="32" height="32" />
            <span>Public Parish</span>
          </Link>

          <nav className="resident-desktop-nav" aria-label="Primary navigation">
            {PRIMARY_NAVIGATION.map((item) => (
              <ResidentNavigationLink
                item={item}
                key={item.href}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="resident-context-controls">
            <AreaSelector
              trigger={(props) => (
                <button
                  {...props}
                  className="resident-context-control"
                  type="button"
                >
                  <MapPinIcon aria-hidden="true" />
                  <span className="resident-context-label">
                    {area ? areaName(area) : 'Choose area'}
                  </span>
                </button>
              )}
            />
            <Link
              className="resident-account-control"
              to="/following"
              aria-label="Open account and following"
            >
              <CircleUserRoundIcon aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {online ? null : (
        <div className="pp-offline-bar" role="status">
          You are offline. Showing the information already loaded.
        </div>
      )}

      {children}

      <nav className="resident-mobile-nav" aria-label="Primary navigation">
        {PRIMARY_NAVIGATION.map((item) => (
          <ResidentNavigationLink
            item={item}
            key={item.href}
            pathname={pathname}
          />
        ))}
      </nav>
    </div>
  )
}

function ResidentNavigationLink({
  item,
  pathname,
}: {
  item: NavigationItem
  pathname: string
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = item.icon

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className="resident-nav-link"
      data-active={isActive ? '' : undefined}
      to={item.href}
      onClick={(event) => {
        if (!isActive) return
        event.preventDefault()
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      }}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  )
}

export function ResidentStandalone({ children }: { children: ReactNode }) {
  return (
    <div className="resident-blueprint resident-blueprint-standalone">
      <a className="resident-skip-link" href="#resident-main">
        Skip to content
      </a>
      <header className="resident-standalone-header">
        <Link aria-label="Public Parish home" className="resident-brand" to="/">
          <img src="/brand-mark.svg" alt="" width="32" height="32" />
          <span>Public Parish</span>
        </Link>
      </header>
      {children}
    </div>
  )
}
