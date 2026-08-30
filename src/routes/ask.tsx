import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

type AskSearch = { q?: string; scope?: string }

function parseAskSearch(search: Record<string, unknown>): AskSearch {
  const text = (value: unknown) =>
    typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined

  return { q: text(search.q), scope: text(search.scope) }
}

export const Route = createFileRoute('/ask')({
  component: ResidentAsk,
  validateSearch: parseAskSearch,
})

function ResidentAsk() {
  const { q, scope } = Route.useSearch()

  return (
    <BlueprintPage
      contractKey="ask"
      routeDetail={
        scope ? (
          <>
            Scope handed over from the record page: {scope}
            {q ? `. Question: ${q}` : '.'}
          </>
        ) : undefined
      }
    />
  )
}
