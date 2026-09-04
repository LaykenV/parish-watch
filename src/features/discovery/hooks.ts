import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

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

/*
  Pixel height the software keyboard covers inside the layout viewport. Sticky
  bottom docks add it back so a composer stays above the keyboard.
*/
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () =>
      setInset(Math.max(0, Math.round(window.innerHeight - viewport.height)))
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    update()
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}

type ConnectivityRequest = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<unknown>

export async function canReachOrigin(
  request: ConnectivityRequest = fetch,
): Promise<boolean> {
  try {
    await request('/brand-mark.svg', { cache: 'no-store', method: 'HEAD' })
    return true
  } catch {
    return false
  }
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let probe = 0
    const markOnline = () => {
      probe += 1
      setOnline(true)
    }
    const update = () => {
      if (navigator.onLine) {
        markOnline()
        return
      }
      const currentProbe = ++probe
      void canReachOrigin().then((reachable) => {
        if (currentProbe === probe) setOnline(reachable)
      })
    }
    const updateWhenVisible = () => {
      if (document.visibilityState === 'visible') update()
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    window.addEventListener('focus', update)
    window.addEventListener('pageshow', update)
    document.addEventListener('visibilitychange', updateWhenVisible)
    update()
    return () => {
      probe += 1
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('pageshow', update)
      document.removeEventListener('visibilitychange', updateWhenVisible)
    }
  }, [])

  return online
}

export function useRepeatedAnnouncement(message: string) {
  const [announcement, setAnnouncement] = useState('')
  const frameRef = useRef(0)

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), [])

  const announce = () => {
    window.cancelAnimationFrame(frameRef.current)
    setAnnouncement('')
    frameRef.current = window.requestAnimationFrame(() => {
      setAnnouncement(message)
    })
  }

  return [announcement, announce] as const
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
