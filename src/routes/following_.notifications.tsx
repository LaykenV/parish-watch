import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/following_/notifications')({
  component: () => <BlueprintPage contractKey="notifications" />,
})
