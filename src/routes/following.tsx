import { createFileRoute } from '@tanstack/react-router'

import { parseFollowingSearch } from '../features/following/contracts'
import { FollowingPage } from '../features/following/following-page'
import { loadFollowingPageData } from '../features/following/following-page.data'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'

export const Route = createFileRoute('/following')({
  component: FollowingRoute,
  loaderDeps: ({ search }) => ({ fixture: search.fixture }),
  loader: ({ deps }) => loadFollowingPageData(deps.fixture),
  validateSearch: parseFollowingSearch,
})

function FollowingRoute() {
  const { returnTo } = Route.useSearch()

  return (
    <ResidentShell>
      <FollowingPage
        data={Route.useLoaderData()}
        returnTo={returnTo}
        view="following"
      />
    </ResidentShell>
  )
}
