import { createFileRoute } from '@tanstack/react-router'

import { parseCoverageSearch } from '../features/coverage/contracts'
import { CoveragePage } from '../features/coverage/coverage-page'
import { loadCoveragePageData } from '../features/coverage/coverage-page.data'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/coverage')({
  component: CoverageRoute,
  loaderDeps: ({ search }) => ({ fixture: search.fixture }),
  loader: ({ deps }) => loadCoveragePageData(deps.fixture),
  validateSearch: parseCoverageSearch,
})

function CoverageRoute() {
  return (
    <ResidentShell>
      <CoveragePage data={Route.useLoaderData()} />
    </ResidentShell>
  )
}
