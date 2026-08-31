import {
  ExternalLinkIcon,
  FileTextIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ElementType, ReactNode } from 'react'

import { formatDate } from '../discovery/format'
import { useMediaQuery } from '../discovery/hooks'
import {
  Sheet,
  sheetExitDelay,
  shouldRestoreSheetFocus,
} from '../discovery/sheet'
import {
  citationSummary,
  documentHost,
  evidenceSheetSize,
} from './evidence-model'
import type { CitationData, CitationMap } from './contracts'

import './evidence.css'

const PANEL_ID = 'pp-evidence-panel'

type EvidenceContextValue = {
  citations: CitationMap
  docked: boolean
  panelId: string
  restoreFocus: () => void
  select: (id: string | null, opener?: HTMLElement | null) => void
  selected: string | null
  triggerId: string | null
}

const EvidenceContext = createContext<EvidenceContextValue | null>(null)

function useEvidence(): EvidenceContextValue {
  const value = useContext(EvidenceContext)
  if (!value) throw new Error('Evidence controls need an EvidenceProvider.')
  return value
}

export function EvidenceProvider({
  children,
  citations,
  onSelect,
  selected,
}: {
  children: ReactNode
  citations: CitationMap
  onSelect: (id: string | null) => void
  selected: string | null
}) {
  const wide = useMediaQuery('(min-width: 64.0625rem)')
  const [hydrated, setHydrated] = useState(false)
  const [triggerId, setTriggerId] = useState<string | null>(null)
  useEffect(() => setHydrated(true), [])
  const docked = hydrated && wide

  const openerRef = useRef<HTMLElement | null>(null)
  const openerCitationRef = useRef<string | null>(null)
  const previousSelected = useRef<string | null>(null)

  const select = useCallback(
    (id: string | null, opener?: HTMLElement | null) => {
      if (opener) {
        openerRef.current = opener
        openerCitationRef.current = id
        setTriggerId(opener.id)
      }
      onSelect(id)
    },
    [onSelect],
  )

  const restoreFocus = useCallback(() => {
    openerRef.current?.focus()
    openerRef.current = null
    openerCitationRef.current = null
    setTriggerId(null)
  }, [])

  useEffect(() => {
    if (!selected || openerCitationRef.current === selected) return

    const fallback = Array.from(
      document.querySelectorAll<HTMLElement>('.ev-source'),
    ).find((control) => control.dataset.citationId === selected)

    openerRef.current = fallback ?? null
    openerCitationRef.current = selected
    setTriggerId(fallback?.id ?? null)
  }, [selected])

  useEffect(() => {
    const was = previousSelected.current
    previousSelected.current = selected
    if (docked && was !== null && selected === null) restoreFocus()
  }, [docked, restoreFocus, selected])

  const value = useMemo(
    () => ({
      citations,
      docked,
      panelId: PANEL_ID,
      restoreFocus,
      select,
      selected,
      triggerId,
    }),
    [citations, docked, restoreFocus, select, selected, triggerId],
  )

  return (
    <EvidenceContext.Provider value={value}>
      {children}
      {docked ? null : <EvidenceSheet />}
    </EvidenceContext.Provider>
  )
}

/*
  The gutter claim. On a phone the Source control follows the sentence it
  supports. From 48rem up it moves into the left margin so the page reads as a
  record with its citations in the margin.
*/
export function Claim({
  children,
  citationId,
  citationIds,
  tag: Tag = 'div',
  wrap = true,
}: {
  children: ReactNode
  citationId?: string
  citationIds?: readonly string[]
  tag?: ElementType
  wrap?: boolean
}) {
  const { selected } = useEvidence()
  const ids = citationIds ?? (citationId ? [citationId] : [])
  const isSelected = selected != null && ids.includes(selected)

  return (
    <Tag className="ev-claim" data-selected={isSelected ? '' : undefined}>
      {wrap ? <div className="ev-claim-body">{children}</div> : children}
      {ids.map((id) => (
        <SourceControl citationId={id} key={id} />
      ))}
    </Tag>
  )
}

/*
  Selects a citation in the existing viewer. Rows outside a claim, such as the
  Ask "Sources used" inventory, use this instead of a second viewer.
*/
export function useEvidenceSelect() {
  return useEvidence().select
}

export function SourceControl({ citationId }: { citationId: string }) {
  const { citations, docked, panelId, select, selected } = useEvidence()
  const controlId = useId()
  const citation = citations[citationId]
  if (!citation) return null

  const isSelected = selected === citationId

  return (
    <button
      aria-controls={panelId}
      aria-expanded={isSelected}
      aria-haspopup={docked ? undefined : 'dialog'}
      className="ev-source"
      data-citation-id={citationId}
      data-selected={isSelected ? '' : undefined}
      id={controlId}
      onClick={(event) =>
        select(isSelected ? null : citationId, event.currentTarget)
      }
      type="button"
    >
      <span className="ev-source-label">Source</span>
      <span className="ev-source-locator">{citation.locator}</span>
      <span className="visually-hidden">
        , {citationSummary(citation)}, {citation.body}
      </span>
    </button>
  )
}

/*
  Desktop only. The panel docks in the rail beside the highlighted claim and
  keeps its own close control so focus can return to the Source that opened it.
  An empty hidden target keeps the Source aria-controls reference truthful
  while no citation is selected.
*/
export function EvidencePanel() {
  const { citations, docked, panelId, select, selected } = useEvidence()
  const panelRef = useRef<HTMLElement>(null)
  const citation = selected ? citations[selected] : undefined

  useEffect(() => {
    if (!docked || !citation) return
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      active.classList.contains('ev-source')
    ) {
      panelRef.current?.focus()
    }
  }, [citation, docked])

  if (!docked) return null

  if (!citation) return <div hidden id={panelId} />

  return (
    <section
      aria-label="Official source"
      className="ev-panel"
      id={panelId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          select(null)
        }
      }}
      ref={panelRef}
      tabIndex={-1}
    >
      <header className="ev-panel-head">
        <p className="ev-panel-kicker">
          <FileTextIcon aria-hidden="true" />
          Official source
        </p>
        <button
          aria-label="Close the source"
          className="ev-panel-close"
          onClick={() => select(null)}
          type="button"
        >
          <XIcon aria-hidden="true" />
        </button>
      </header>
      <EvidenceBody citation={citation} />
    </section>
  )
}

function EvidenceSheet() {
  const { citations, restoreFocus, select, selected, triggerId } = useEvidence()
  const citation = selected ? citations[selected] : undefined
  const focusReturnTimerRef = useRef<number | null>(null)
  const lastCitationRef = useRef<CitationData | undefined>(citation)

  useEffect(() => {
    if (!citation) return
    lastCitationRef.current = citation
    if (focusReturnTimerRef.current !== null) {
      window.clearTimeout(focusReturnTimerRef.current)
      focusReturnTimerRef.current = null
    }
  }, [citation])
  useEffect(
    () => () => {
      if (focusReturnTimerRef.current !== null) {
        window.clearTimeout(focusReturnTimerRef.current)
      }
    },
    [],
  )

  const renderedCitation = citation ?? lastCitationRef.current

  return (
    <Sheet
      className="ev-sheet"
      onOpenChange={(open) => {
        if (!open) {
          select(null)
          if (focusReturnTimerRef.current !== null) {
            window.clearTimeout(focusReturnTimerRef.current)
          }
          focusReturnTimerRef.current = window.setTimeout(() => {
            if (shouldRestoreSheetFocus()) restoreFocus()
            lastCitationRef.current = undefined
            focusReturnTimerRef.current = null
          }, sheetExitDelay())
        }
      }}
      open={Boolean(citation)}
      popupId={PANEL_ID}
      size={renderedCitation ? evidenceSheetSize(renderedCitation) : 'medium'}
      title="Official source"
      triggerId={triggerId}
    >
      {renderedCitation ? <EvidenceBody citation={renderedCitation} /> : null}
    </Sheet>
  )
}

function EvidenceBody({ citation }: { citation: CitationData }) {
  const noteId = useId()
  const place =
    citation.section ?? (citation.page ? `Page ${citation.page}` : undefined)

  return (
    <div className="ev-viewer">
      <p className="ev-viewer-meta">
        <span>{citation.documentKind}</span>
        {place ? <span>{place}</span> : null}
        <span>Retrieved {formatDate(citation.retrievedAt)}</span>
      </p>
      <h3 className="ev-viewer-title">{citation.documentTitle}</h3>
      <p className="ev-viewer-body">{citation.body}</p>

      {citation.warning ? (
        <p className="ev-viewer-warning">
          <TriangleAlertIcon aria-hidden="true" />
          <span>{citation.warning}</span>
        </p>
      ) : null}

      <blockquote aria-describedby={noteId} className="ev-quote">
        {citation.excerpt.before ? (
          <span className="ev-quote-context">{citation.excerpt.before} </span>
        ) : null}
        <mark className="ev-quote-support">{citation.excerpt.quote}</mark>
        {citation.excerpt.after ? (
          <span className="ev-quote-context"> {citation.excerpt.after}</span>
        ) : null}
      </blockquote>
      <p className="ev-quote-note" id={noteId}>
        The darker words are the exact text that supports this claim. The
        lighter words are the sentences around it in the same document.
      </p>

      <a
        className="ev-viewer-open"
        href={citation.officialUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLinkIcon aria-hidden="true" />
        <span>Open official document</span>
        <span className="ev-viewer-host">
          {documentHost(citation.officialUrl)}
        </span>
      </a>
    </div>
  )
}
