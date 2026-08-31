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

const SHEET_COMPLETION_FALLBACK_MS = 300

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
  const desktopMatch = useMediaQuery('(min-width: 64.0625rem)')
  const [hydrated, setHydrated] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => setHydrated(true), [])
  const desktop = hydrated && desktopMatch

  const resolveInitialFocus = () => closeRef.current
  const resolveFinalFocus = () =>
    (triggerId ? document.getElementById(triggerId) : null) ?? openerRef.current
  const handleRootOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true)
      return
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const finalFocus = resolveFinalFocus()
    window.setTimeout(
      () => {
        const target = finalFocus?.isConnected
          ? finalFocus
          : resolveFinalFocus()
        target?.focus()
        openerRef.current = null
      },
      reducedMotion ? 0 : SHEET_COMPLETION_FALLBACK_MS,
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
