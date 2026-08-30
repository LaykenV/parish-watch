import type { RefObject } from 'react'
import { useEffect, useId } from 'react'

import { Button } from '../../components/ui/button'
import { MAX_ASK_LENGTH, NEAR_LIMIT } from './contracts'

/*
  The composer is the fourth visual level: useful, but secondary while an
  answer is on screen. No attachments, model choice, or URL draft. The draft
  lives above this component so it survives a citation sheet opening and
  closing, and is cleared only after the adapter accepts a submission.
*/

export function AskComposer({
  canSubmit,
  draft,
  inputRef,
  label,
  onDraftChange,
  onSubmit,
  pending,
  privacyNote,
  sendLabel,
}: {
  canSubmit: boolean
  draft: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  label: string
  onDraftChange: (draft: string) => void
  onSubmit: () => void
  pending: boolean
  privacyNote: boolean
  sendLabel: string
}) {
  const fieldId = useId()
  const countId = useId()
  const nearLimit = draft.length > MAX_ASK_LENGTH - NEAR_LIMIT
  const overLimit = draft.length > MAX_ASK_LENGTH

  useEffect(() => {
    const field = inputRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [draft, inputRef])

  return (
    <form
      aria-label={label}
      className="ask-composer"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onSubmit()
      }}
    >
      <label className="ask-composer-label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        aria-describedby={nearLimit ? countId : undefined}
        className="ask-composer-field"
        id={fieldId}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key !== 'Enter' ||
            event.shiftKey ||
            event.nativeEvent.isComposing
          ) {
            return
          }
          if (!window.matchMedia('(pointer: fine)').matches) return
          event.preventDefault()
          if (canSubmit) onSubmit()
        }}
        ref={inputRef}
        rows={2}
        value={draft}
      />
      <div className="ask-composer-row">
        {nearLimit ? (
          <p className="ask-composer-count" id={countId}>
            {overLimit
              ? `${draft.length - MAX_ASK_LENGTH} over the limit`
              : `${MAX_ASK_LENGTH - draft.length} characters left`}
          </p>
        ) : null}
        <Button
          disabled={!canSubmit}
          loading={pending}
          size="touch"
          type="submit"
        >
          {sendLabel}
        </Button>
      </div>
      {privacyNote ? (
        <p className="ask-composer-privacy">
          No account needed. This anonymous conversation is available on this
          device for 24 hours.
        </p>
      ) : null}
    </form>
  )
}
