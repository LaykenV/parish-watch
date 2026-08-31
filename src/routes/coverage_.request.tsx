import { createFileRoute } from '@tanstack/react-router'

import { parseCoverageRequestSearch } from '../features/coverage/contracts'
import { CoverageRequestPage } from '../features/coverage/coverage-page'
import { loadCoverageRequestPageData } from '../features/coverage/coverage-page.data'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/coverage_/request')({
  component: CoverageRequestRoute,
  loaderDeps: ({ search }) => ({ fixture: search.fixture }),
  loader: ({ deps }) => loadCoverageRequestPageData(deps.fixture),
  validateSearch: parseCoverageRequestSearch,
})

function CoverageRequestRoute() {
  return (
    <ResidentShell>
      <CoverageRequestPage data={Route.useLoaderData()} />
    </ResidentShell>
  )
}
