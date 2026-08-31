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
  onOpenChangeComplete?: (open: boolean) => void
  open: boolean
  popupId?: string
  size?: 'medium' | 'tall' | 'full'
  title: string
  triggerId?: string | null
  trigger?: (props: React.ComponentProps<'button'>) => ReactElement
}

export function Sheet({
  open,
  onOpenChange,
  onOpenChangeComplete,
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
  useEffect(() => setHydrated(true), [])
  const desktop = hydrated && desktopMatch
  const handleOpenChangeComplete = (next: boolean) => {
    onOpenChangeComplete?.(next)
  }

  if (!desktop) {
    return (
      <Drawer.Root
        onOpenChange={onOpenChange}
        onOpenChangeComplete={handleOpenChangeComplete}
        open={open}
        swipeDirection="down"
        triggerId={triggerId}
      >
        {trigger ? <Drawer.Trigger render={trigger} /> : null}
        <Drawer.Portal>
          <Drawer.Backdrop className="pp-backdrop" />
          <Drawer.Viewport className="pp-drawer-viewport">
            <Drawer.Popup
              className={['pp-sheet', className].filter(Boolean).join(' ')}
              data-modal-kind="drawer"
              data-size={size}
              id={popupId}
              initialFocus={closeRef}
            >
              <span aria-hidden="true" className="pp-sheet-grabber" />
              <header className="pp-sheet-head">
                <Drawer.Title className="pp-sheet-title">{title}</Drawer.Title>
                <Drawer.Close
                  aria-label="Close"
                  className="pp-sheet-close"
                  onClick={() => onOpenChange(false)}
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
    <Dialog.Root
      onOpenChange={onOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
      open={open}
      triggerId={triggerId}
    >
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="pp-backdrop" />
        <Dialog.Popup
          className={['pp-sheet', className].filter(Boolean).join(' ')}
          data-modal-kind="dialog"
          data-size={size}
          id={popupId}
          initialFocus={closeRef}
        >
          <header className="pp-sheet-head">
            <Dialog.Title className="pp-sheet-title">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="pp-sheet-close"
              onClick={() => onOpenChange(false)}
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
