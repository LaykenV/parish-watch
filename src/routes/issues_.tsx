import { createFileRoute } from '@tanstack/react-router'

import { parseIssuesSearch } from '../features/discovery/contracts'
import { IssuesIndexPage } from '../features/discovery/issues-index'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/issues_')({
  component: ResidentIssues,
  validateSearch: parseIssuesSearch,
})

function ResidentIssues() {
  const search = Route.useSearch()

  return (
    <ResidentShell>
      <IssuesIndexPage search={search} />
    </ResidentShell>
  )
}
