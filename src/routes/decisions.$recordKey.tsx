import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  getActiveEvidenceFixture,
  parseEvidenceSearch,
} from '../features/evidence/contracts'
import { loadDecisionPageData } from '../features/evidence/evidence-page.data'
import { DecisionPage } from '../features/evidence/decision-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/decisions/$recordKey')({
  component: ResidentDecision,
  loader: ({ deps, params }) =>
    loadDecisionPageData(params.recordKey, deps.fixture),
  loaderDeps: ({ search }) => ({
    fixture: getActiveEvidenceFixture(search.fixture),
  }),
  validateSearch: parseEvidenceSearch,
})

function ResidentDecision() {
  const { recordKey } = Route.useParams()
  const fixture = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <DecisionPage
        fixture={fixture}
        onSelectSource={(source) =>
          navigate({
            replace: true,
            search: (prev) => ({ ...prev, source: source ?? undefined }),
          })
        }
        recordKey={recordKey}
        search={search}
      />
    </ResidentShell>
  )
}
