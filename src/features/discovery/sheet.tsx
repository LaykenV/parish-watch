import { Dialog } from '@base-ui/react/dialog'
import { Drawer } from '@base-ui/react/drawer'
import { XIcon } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useMediaQuery, useOverlay } from './hooks'

type SheetProps = {
  children: ReactNode
  className?: string
  description?: string
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  popupId?: string
  size?: 'medium' | 'tall' | 'full'
  title: string
  triggerId?: string | null
  trigger?: (props: React.ComponentProps<'button'>) => ReactElement
}

const SHEET_DESKTOP_QUERY = '(min-width: 64.0625rem)'
const SHEET_EXIT_FALLBACK_MS = 240

// Focus returns to the opener once the sheet has finished animating out. The
// desktop dialog has no exit animation, so waiting there is dead time. Reading
// `--dur-standard` keeps this in step with the motion tokens in styles.css.
export function sheetExitDelay(): number {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
  if (window.matchMedia(SHEET_DESKTOP_QUERY).matches) return 0

  const token = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--dur-standard')
    .trim()
  const value = Number.parseFloat(token)
  if (!Number.isFinite(value) || value <= 0) return SHEET_EXIT_FALLBACK_MS
  return token.endsWith('ms') ? value : value * 1000
}

export function shouldRestoreSheetFocus(): boolean {
  const active = document.activeElement
  return (
    active === null ||
    active === document.body ||
    (active instanceof HTMLElement &&
      active.closest('.pp-sheet[aria-hidden="true"]') !== null)
  )
}

export function Sheet({
  open,
  onOpenChange,
  title,
  triggerId,
  description,
  children,
  className,
  footer,
  popupId,
  size = 'tall',
  trigger,
}: SheetProps) {
  useOverlay(open)
  const desktopMatch = useMediaQuery(SHEET_DESKTOP_QUERY)
  const [hydrated, setHydrated] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const focusFrameRef = useRef(0)
  const focusInnerFrameRef = useRef(0)
  const focusReturnTimerRef = useRef<number | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => setHydrated(true), [])
  useEffect(
    () => () => {
      if (focusReturnTimerRef.current !== null) {
        window.clearTimeout(focusReturnTimerRef.current)
      }
      window.cancelAnimationFrame(focusFrameRef.current)
      window.cancelAnimationFrame(focusInnerFrameRef.current)
    },
    [],
  )
  useEffect(() => {
    if (!open) return
    if (focusReturnTimerRef.current !== null) {
      window.clearTimeout(focusReturnTimerRef.current)
      focusReturnTimerRef.current = null
    }
    window.cancelAnimationFrame(focusFrameRef.current)
    window.cancelAnimationFrame(focusInnerFrameRef.current)
    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusInnerFrameRef.current = window.requestAnimationFrame(() => {
        const close = closeRef.current
        if (close?.closest('.pp-sheet[data-open]')) close.focus()
      })
    })
    return () => {
      window.cancelAnimationFrame(focusFrameRef.current)
      window.cancelAnimationFrame(focusInnerFrameRef.current)
    }
  }, [open])
  const desktop = hydrated && desktopMatch

  const resolveInitialFocus = () => closeRef.current
  const resolveFinalFocus = () =>
    (triggerId ? document.getElementById(triggerId) : null) ?? openerRef.current
  const handleRootOpenChange = (next: boolean) => {
    if (next) {
      if (focusReturnTimerRef.current !== null) {
        window.clearTimeout(focusReturnTimerRef.current)
        focusReturnTimerRef.current = null
      }
      onOpenChange(true)
      return
    }

    window.cancelAnimationFrame(focusFrameRef.current)
    window.cancelAnimationFrame(focusInnerFrameRef.current)
    const finalFocus = resolveFinalFocus()
    if (focusReturnTimerRef.current !== null) {
      window.clearTimeout(focusReturnTimerRef.current)
    }
    focusReturnTimerRef.current = window.setTimeout(
      () => {
        const target = finalFocus?.isConnected
          ? finalFocus
          : resolveFinalFocus()
        if (shouldRestoreSheetFocus()) target?.focus()
        openerRef.current = null
        focusReturnTimerRef.current = null
      },
      sheetExitDelay(),
    )
    onOpenChange(false)
  }
  const renderTrigger = trigger
    ? (props: React.ComponentProps<'button'>) =>
        trigger({
          ...props,
          onClick: (event) => {
            openerRef.current = event.currentTarget
            props.onClick?.(event)
          },
        })
    : undefined

  if (!desktop) {
    return (
      <Drawer.Root
        onOpenChange={handleRootOpenChange}
        open={open}
        swipeDirection="down"
      >
        {renderTrigger ? <Drawer.Trigger render={renderTrigger} /> : null}
        <Drawer.Portal>
          <Drawer.Backdrop className="pp-backdrop" />
          <Drawer.Viewport className="pp-drawer-viewport">
            <Drawer.Popup
              aria-hidden={open ? undefined : true}
              className={['pp-sheet', className].filter(Boolean).join(' ')}
              data-modal-kind="drawer"
              data-size={size}
              finalFocus={triggerId ? resolveFinalFocus : undefined}
              id={popupId}
              initialFocus={resolveInitialFocus}
              inert={open ? undefined : true}
            >
              <span aria-hidden="true" className="pp-sheet-grabber" />
              <header className="pp-sheet-head">
                <Drawer.Title className="pp-sheet-title">{title}</Drawer.Title>
                <Drawer.Close
                  aria-label="Close"
                  autoFocus
                  className="pp-sheet-close"
                  ref={closeRef}
                >
                  <XIcon aria-hidden="true" />
                </Drawer.Close>
              </header>
              {description ? (
                <Drawer.Description className="pp-sheet-description">
                  {description}
                </Drawer.Description>
              ) : null}
              <Drawer.Content render={<div className="pp-sheet-body" />}>
                {children}
              </Drawer.Content>
              {footer ? (
                <Drawer.Content render={<div className="pp-sheet-footer" />}>
                  {footer}
                </Drawer.Content>
              ) : null}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return (
    <Dialog.Root onOpenChange={handleRootOpenChange} open={open}>
      {renderTrigger ? <Dialog.Trigger render={renderTrigger} /> : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="pp-backdrop" />
        <Dialog.Popup
          aria-hidden={open ? undefined : true}
          className={['pp-sheet', className].filter(Boolean).join(' ')}
          data-modal-kind="dialog"
          data-size={size}
          finalFocus={triggerId ? resolveFinalFocus : undefined}
          id={popupId}
          initialFocus={resolveInitialFocus}
          inert={open ? undefined : true}
        >
          <header className="pp-sheet-head">
            <Dialog.Title className="pp-sheet-title">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              autoFocus
              className="pp-sheet-close"
              ref={closeRef}
            >
              <XIcon aria-hidden="true" />
            </Dialog.Close>
          </header>
          {description ? (
            <Dialog.Description className="pp-sheet-description">
              {description}
            </Dialog.Description>
          ) : null}
          <div className="pp-sheet-body">{children}</div>
          {footer ? <div className="pp-sheet-footer">{footer}</div> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
