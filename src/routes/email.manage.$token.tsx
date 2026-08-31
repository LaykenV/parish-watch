import { createFileRoute } from '@tanstack/react-router'

import { parseEmailManagementSearch } from '../features/following/contracts'
import { EmailManagementPage } from '../features/following/email-management-page'
import { loadEmailManagementData } from '../features/following/following-page.data'

export const Route = createFileRoute('/email/manage/$token')({
  component: EmailManagementRoute,
  loaderDeps: ({ search }) => ({ fixture: search.fixture }),
  loader: ({ deps }) => loadEmailManagementData(deps.fixture),
  validateSearch: parseEmailManagementSearch,
})

function EmailManagementRoute() {
  return <EmailManagementPage data={Route.useLoaderData()} />
}
