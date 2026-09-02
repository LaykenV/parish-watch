import { createFileRoute } from '@tanstack/react-router'

import { parseEmailManagementSearch } from '../features/following/contracts'
import {
  EmailManagementPage,
  LiveEmailManagementPage,
} from '../features/following/email-management-page'
import { loadEmailManagementData } from '../features/following/following-page.data'

export const Route = createFileRoute('/email/manage/$token')({
  component: EmailManagementRoute,
  head: () => ({
    meta: [{ content: 'no-referrer', name: 'referrer' }],
  }),
  loaderDeps: ({ search }) => ({ fixture: search.fixture }),
  loader: ({ deps }) => loadEmailManagementData(deps.fixture),
  validateSearch: parseEmailManagementSearch,
})

function EmailManagementRoute() {
  const data = Route.useLoaderData()
  const { token } = Route.useParams()
  return data.available ? (
    <EmailManagementPage data={data} />
  ) : (
    <LiveEmailManagementPage token={token} />
  )
}
