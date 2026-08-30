import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/how-it-works')({
  component: () => <BlueprintPage contractKey="how-it-works" />,
})
