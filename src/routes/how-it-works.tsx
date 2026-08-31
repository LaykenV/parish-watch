import { createFileRoute } from '@tanstack/react-router'

import { HowItWorksPage } from '../features/coverage/how-it-works-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksRoute,
})

function HowItWorksRoute() {
  return (
    <ResidentShell>
      <HowItWorksPage />
    </ResidentShell>
  )
}
