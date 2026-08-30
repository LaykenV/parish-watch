import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Menu } from '@base-ui/react/menu'

import { Button } from '../../components/ui/button'

type PillOption = { label: string; value: string }

export function FilterPill({
  defaultValue = '',
  label,
  onChange,
  options,
  value,
}: {
  defaultValue?: string
  label: string
  onChange: (value: string) => void
  options: readonly PillOption[]
  value: string
}) {
  const selected =
    value && value !== defaultValue
      ? options.find((option) => option.value === value)
      : undefined

  return (
    <Menu.Root>
      <Menu.Trigger
        className="pp-pill"
        data-selected={selected ? '' : undefined}
      >
        {selected ? selected.label : label}
        <ChevronDownIcon aria-hidden="true" className="pp-pill-chevron" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align="start"
          className="pp-menu-positioner"
          sideOffset={6}
        >
          <Menu.Popup className="pp-menu">
            <Menu.RadioGroup
              onValueChange={(next) => onChange(String(next))}
              value={value}
            >
              {options.map((option) => (
                <Menu.RadioItem
                  className="pp-menu-item"
                  key={option.value || 'all'}
                  value={option.value}
                >
                  <Menu.RadioItemIndicator className="pp-menu-check">
                    <CheckIcon aria-hidden="true" />
                  </Menu.RadioItemIndicator>
                  {option.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function FilterGroup({
  label,
  onChange,
  options,
  value,
  name,
}: {
  label: string
  name: string
  onChange: (value: string) => void
  options: readonly (PillOption | string)[]
  value: string
}) {
  const normalized = options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option,
  )

  return (
    <fieldset className="pp-filter-group">
      <legend>{label}</legend>
      <div className="pp-filter-options">
        {normalized.map((option) => (
          <label className="pp-filter-option" key={option.value || 'all'}>
            <input
              checked={value === option.value}
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function MoreFiltersPanel({
  activeCount,
  onClear,
  children,
}: {
  activeCount: number
  onClear: () => void
  children: ReactNode
}) {
  return (
    <div className="pp-more-filters">
      <div className="pp-more-filters-head">
        <p className="pp-more-filters-title">More filters</p>
        {activeCount > 0 ? (
          <Button
            className="pp-filter-clear"
            onClick={onClear}
            size="touch"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
            Clear all
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export function ShowResultsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="pp-filter-apply" onClick={onClick} size="touch">
      Show results
    </Button>
  )
}
