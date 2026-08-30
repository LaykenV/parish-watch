import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/meetings/$meetingId')({
  component: MeetingBlueprintRoute,
})

function MeetingBlueprintRoute() {
  const { meetingId } = Route.useParams()

  return (
    <BlueprintPage
      contractKey="meeting"
      routeDetail={<>Route meeting: {meetingId}</>}
    />
  )
}
