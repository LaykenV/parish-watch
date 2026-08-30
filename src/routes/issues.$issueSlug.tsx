import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { parseEvidenceSearch } from '../features/evidence/contracts'
import { IssuePage } from '../features/evidence/issue-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/issues/$issueSlug')({
  component: ResidentIssue,
  validateSearch: parseEvidenceSearch,
})

function ResidentIssue() {
  const { issueSlug } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <IssuePage
        onSelectSource={(source) =>
          navigate({
            replace: true,
            search: (prev) => ({ ...prev, source: source ?? undefined }),
          })
        }
        search={search}
        slug={issueSlug}
      />
    </ResidentShell>
  )
}
