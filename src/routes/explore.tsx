import { createFileRoute } from '@tanstack/react-router'

import { parseExploreSearch } from '../features/discovery/contracts'
import { ExplorePage } from '../features/discovery/explore'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/explore')({
  component: ResidentExplore,
  validateSearch: parseExploreSearch,
})

function ResidentExplore() {
  const search = Route.useSearch()

  return (
    <ResidentShell>
      <ExplorePage search={search} />
    </ResidentShell>
  )
}
