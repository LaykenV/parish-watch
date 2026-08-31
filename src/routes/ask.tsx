import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  askScopeIdentity,
  getActiveAskFixture,
  askScopeKey,
  parseAskSearch,
  routeSearchFromScopeKey,
} from '../features/ask/contracts'
import { AskPage } from '../features/ask/ask-page'
import { ResidentShell } from '../features/resident-blueprint/resident-shell'
import { loadAskPageData } from './ask.data'

export const Route = createFileRoute('/ask')({
  component: ResidentAsk,
  loaderDeps: ({ search }) => ({
    fixture: getActiveAskFixture(search.fixture),
    returnTo: search.returnTo,
    scopeKey: askScopeKey(search),
  }),
  loader: ({ deps }) =>
    loadAskPageData(deps.fixture, deps.scopeKey, deps.returnTo),
  validateSearch: parseAskSearch,
})

function ResidentAsk() {
  const data = Route.useLoaderData()
  const { source } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ResidentShell>
      <AskPage
        data={data}
        onRestoreScope={(scope) =>
          navigate({
            replace: true,
            search: (prev) => ({
              ...routeSearchFromScopeKey(askScopeIdentity(scope)),
              fixture: prev.fixture,
              returnTo:
                askScopeIdentity(scope) === askScopeKey(prev)
                  ? prev.returnTo
                  : undefined,
              source: prev.source,
            }),
          })
        }
        onSelectSource={(selected) =>
          navigate({
            replace: true,
            search: (prev) => ({ ...prev, source: selected ?? undefined }),
          })
        }
        source={source}
      />
    </ResidentShell>
  )
}
