import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPage } from '../features/privacy/privacy-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/privacy')({
  component: PrivacyRoute,
})

function PrivacyRoute() {
  return (
    <ResidentShell>
      <PrivacyPage />
    </ResidentShell>
  )
}
