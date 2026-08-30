import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { parseEvidenceSearch } from '../features/evidence/contracts'
import { MeetingPage } from '../features/evidence/meeting-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/meetings/$meetingId')({
  component: ResidentMeeting,
  validateSearch: parseEvidenceSearch,
})

function ResidentMeeting() {
  const { meetingId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <MeetingPage
        meetingId={meetingId}
        onSelectSource={(source) =>
          navigate({
            replace: true,
            search: (prev) => ({ ...prev, source: source ?? undefined }),
          })
        }
        search={search}
      />
    </ResidentShell>
  )
}
