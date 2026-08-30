import { useEffect, useState, useSyncExternalStore } from 'react'

let overlayCount = 0
const overlayListeners = new Set<() => void>()

function emitOverlay() {
  for (const listener of overlayListeners) listener()
}

function startOverlay() {
  overlayCount += 1
  emitOverlay()
  return () => {
    overlayCount = Math.max(0, overlayCount - 1)
    emitOverlay()
  }
}

function subscribeOverlay(listener: () => void) {
  overlayListeners.add(listener)
  return () => {
    overlayListeners.delete(listener)
  }
}

function getOverlayOpen(): boolean {
  return overlayCount > 0
}

export function useOverlay(open: boolean) {
  useEffect(() => {
    if (!open) return
    return startOverlay()
  }, [open])
}

export function useOverlayOpen(): boolean {
  return useSyncExternalStore(subscribeOverlay, getOverlayOpen, () => false)
}

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => {
      setOpen(window.innerHeight - viewport.height > 150)
    }
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    update()
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return open
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', listener)
      return () => list.removeEventListener('change', listener)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
