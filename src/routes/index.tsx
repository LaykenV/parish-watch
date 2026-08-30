import { createFileRoute } from '@tanstack/react-router'

import { LandingPage } from '../features/landing/landing-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/')({ component: ResidentHome })

function ResidentHome() {
  return (
    <ResidentShell>
      <LandingPage />
    </ResidentShell>
  )
}
