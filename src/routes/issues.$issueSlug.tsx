import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/issues/$issueSlug')({
  component: IssueBlueprintRoute,
})

function IssueBlueprintRoute() {
  const { issueSlug } = Route.useParams()

  return (
    <BlueprintPage
      contractKey="issue"
      routeDetail={<>Route issue: {issueSlug}</>}
    />
  )
}
