import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/email/manage/$token')({
  component: EmailManagementBlueprintRoute,
})

function EmailManagementBlueprintRoute() {
  return (
    <BlueprintPage
      contractKey="email-management"
      routeDetail={<>Scoped management link fixture</>}
      standalone
    />
  )
}
