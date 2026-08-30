import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  getActiveEvidenceFixture,
  parseEvidenceSearch,
} from '../features/evidence/contracts'
import { loadMeetingPageData } from '../features/evidence/evidence-page.data'
import { MeetingPage } from '../features/evidence/meeting-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/meetings/$meetingId')({
  component: ResidentMeeting,
  loader: ({ deps, params }) =>
    loadMeetingPageData(params.meetingId, deps.fixture),
  loaderDeps: ({ search }) => ({
    fixture: getActiveEvidenceFixture(search.fixture),
  }),
  validateSearch: parseEvidenceSearch,
})

function ResidentMeeting() {
  const { meetingId } = Route.useParams()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <MeetingPage
        data={data}
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
