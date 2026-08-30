import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/coverage')({
  component: () => <BlueprintPage contractKey="coverage" />,
})
