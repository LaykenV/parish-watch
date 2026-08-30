import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { setArea, useArea } from './area-store'
import { AREA_FIXTURES } from './fixtures'
import { Sheet } from './sheet'

type AreaSelectorProps = {
  onOpenChange?: (open: boolean) => void
  open?: boolean
  trigger: (props: React.ComponentProps<'button'>) => React.ReactElement
}

export function AreaSelector({
  open,
  onOpenChange,
  trigger,
}: AreaSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open ?? internalOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (open === undefined) setInternalOpen(next)
  }

  return (
    <AreaSelectorDialog
      onOpenChange={setOpen}
      open={isOpen}
      trigger={trigger}
    />
  )
}

function AreaSelectorDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: AreaSelectorProps['trigger']
}) {
  const [query, setQuery] = useState('')
  const area = useArea()
  const normalized = query.trim().toLowerCase()
  const places = AREA_FIXTURES.filter((place) =>
    place.name.toLowerCase().includes(normalized),
  )

  return (
    <Sheet
      className="pp-area-sheet"
      description="Public Parish shows only decision records that pass the publication gate. Area coverage can still be incomplete."
      footer={
        <Link
          className="pp-area-request"
          onClick={() => onOpenChange(false)}
          to="/coverage/request"
        >
          Not seeing your area? Request coverage.
        </Link>
      }
      onOpenChange={onOpenChange}
      open={open}
      size="tall"
      title="Choose a parish or city"
      trigger={trigger}
    >
      <div className="pp-area-search">
        <SearchIcon aria-hidden="true" />
        <input
          aria-label="Search places"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search parishes and cities"
          type="search"
          value={query}
        />
      </div>
      <ul className="pp-area-list">
        {places.map((place) => {
          const selected = place.slug === area
          if (place.status === 'validating') {
            return (
              <li key={place.slug}>
                <div
                  aria-disabled="true"
                  className="pp-area-row"
                  data-status="validating"
                >
                  <span className="pp-area-name">{place.name}</span>
                  <span className="pp-area-status">Validating sources</span>
                  {place.note ? (
                    <span className="pp-area-note">{place.note}</span>
                  ) : null}
                </div>
              </li>
            )
          }
          return (
            <li key={place.slug}>
              <button
                aria-pressed={selected}
                className="pp-area-row"
                data-status="available"
                data-selected={selected || undefined}
                onClick={() => {
                  setArea(place.slug)
                  onOpenChange(false)
                }}
                type="button"
              >
                <span className="pp-area-name">{place.name}</span>
                <span className="pp-area-status">
                  {selected ? 'Watching' : 'Records available'}
                </span>
              </button>
            </li>
          )
        })}
        {places.length === 0 ? (
          <li className="pp-area-empty">No listed place matches “{query}”.</li>
        ) : null}
      </ul>
    </Sheet>
  )
}
