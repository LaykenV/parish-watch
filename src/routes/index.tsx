import { createFileRoute } from '@tanstack/react-router'

import { parseHomeSearch } from '../features/discovery/contracts'
import { HomePage } from '../features/discovery/home'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/')({
  component: ResidentHome,
  validateSearch: parseHomeSearch,
})

function ResidentHome() {
  const { fixture } = Route.useSearch()

  return (
    <ResidentShell>
      <HomePage scenario={fixture} />
    </ResidentShell>
  )
}
