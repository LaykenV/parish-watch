import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { parseEvidenceSearch } from '../features/evidence/contracts'
import { DecisionPage } from '../features/evidence/decision-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/decisions/$recordKey')({
  component: ResidentDecision,
  validateSearch: parseEvidenceSearch,
})

function ResidentDecision() {
  const { recordKey } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <DecisionPage
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
