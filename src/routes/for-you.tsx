import { createFileRoute } from '@tanstack/react-router'

import { parseForYouSearch } from '../features/discovery/contracts'
import { ForYouPage } from '../features/discovery/for-you'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/for-you')({
  component: ResidentForYou,
  validateSearch: parseForYouSearch,
})

function ResidentForYou() {
  const { fixture } = Route.useSearch()

  return (
    <ResidentShell>
      <ForYouPage scenario={fixture} />
    </ResidentShell>
  )
}
