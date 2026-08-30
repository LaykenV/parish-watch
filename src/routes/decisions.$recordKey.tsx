import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/decisions/$recordKey')({
  component: DecisionBlueprintRoute,
})

function DecisionBlueprintRoute() {
  const { recordKey } = Route.useParams()

  return (
    <BlueprintPage
      contractKey="decision"
      routeDetail={<>Route record: {recordKey}</>}
    />
  )
}
