import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  getActiveEvidenceFixture,
  parseEvidenceSearch,
} from '../features/evidence/contracts'
import { loadIssuePageData } from '../features/evidence/evidence-page.data'
import { IssuePage } from '../features/evidence/issue-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/issues/$issueSlug')({
  component: ResidentIssue,
  loader: ({ deps, params }) =>
    loadIssuePageData(params.issueSlug, deps.fixture),
  loaderDeps: ({ search }) => ({
    fixture: getActiveEvidenceFixture(parseEvidenceSearch(search).fixture),
  }),
  validateSearch: parseEvidenceSearch,
})

function ResidentIssue() {
  const { issueSlug } = Route.useParams()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <IssuePage
        data={data}
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
