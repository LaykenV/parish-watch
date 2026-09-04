import { createFileRoute } from '@tanstack/react-router'

import { CoverageOperationsPage } from '../features/operations/coverage-operations-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/operations_/coverage')({
  component: CoverageOperationsRoute,
})

function CoverageOperationsRoute() {
  return (
    <ResidentShell>
      <CoverageOperationsPage />
    </ResidentShell>
  )
}
