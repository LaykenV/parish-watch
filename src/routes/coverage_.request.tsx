import { createFileRoute } from '@tanstack/react-router'

import { BlueprintPage } from '../features/resident-blueprint/blueprint-page'

export const Route = createFileRoute('/coverage_/request')({
  component: () => <BlueprintPage contractKey="coverage-request" />,
})
