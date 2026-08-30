import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type RailProps = {
  ariaLabel: string
  children: ReactNode
}

export function Rail({ ariaLabel, children }: RailProps) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [overflow, setOverflow] = useState(false)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setOverflow(track.scrollWidth > track.clientWidth + 8)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, children])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const first = track.firstElementChild
    const gap = first ? 16 : 320
    const amount = first ? first.clientWidth + gap : 320
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    track.scrollBy({
      behavior: reduced ? 'auto' : 'smooth',
      left: direction * amount,
    })
  }

  return (
    <div className="pp-rail" data-overflow={overflow || undefined}>
      <ul aria-label={ariaLabel} className="pp-rail-track" ref={trackRef}>
        {children}
      </ul>
      {overflow ? (
        <>
          <button
            aria-label={`Scroll ${ariaLabel} back`}
            className="pp-rail-arrow pp-rail-arrow-prev"
            onClick={() => scrollByCard(-1)}
            type="button"
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <button
            aria-label={`Scroll ${ariaLabel} forward`}
            className="pp-rail-arrow pp-rail-arrow-next"
            onClick={() => scrollByCard(1)}
            type="button"
          >
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  )
}
