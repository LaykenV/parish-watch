import {
  corpusScopeFromKey,
  routeSearchFromScopeKey,
} from '../features/ask/contracts'
import type {
  AskAvailability,
  AskRouteSearch,
  AskScenario,
  AskScope,
} from '../features/ask/contracts'

/*
  Route-level data contract for /ask. The page projection is owned by a typed
  adapter. Normal routes use the live adapter. Explicit development scenarios
  resolve through the fixture adapter, which this module loads by dynamic
  import only.
*/

export type AskRouteData = {
  availability: AskAvailability
  routeSearch: AskRouteSearch
  scenario: AskScenario | null
  scope: AskScope
}

export async function loadAskPageData(
  fixture: AskScenario | undefined,
  scopeKey: string,
  returnTo?: string,
): Promise<AskRouteData> {
  const routeSearch = {
    ...routeSearchFromScopeKey(scopeKey),
    returnTo,
  }
  if (!import.meta.env.DEV || !fixture) {
    return {
      availability: { kind: 'available' },
      routeSearch,
      scenario: null,
      scope: initialScope(scopeKey, returnTo),
    }
  }

  const scenario = fixture
  const { getAskFixtureAdapter } = await import('../features/ask/fixtures')
  const adapter = getAskFixtureAdapter(scenario)
  const scope = await adapter.resolveScope(routeSearch)

  return {
    availability: { kind: 'available' },
    routeSearch,
    scenario,
    scope,
  }
}

function initialScope(scopeKey: string, returnTo?: string): AskScope {
  if (scopeKey.startsWith('issue:')) {
    const issueSlug = scopeKey.slice(6)
    return {
      kind: 'issue',
      issueSlug,
      label: 'Answering from this issue',
      recordTitle: 'Loading issue evidence',
      returnTo: returnTo ?? `/issues/${issueSlug}`,
    }
  }
  if (scopeKey.startsWith('meeting:')) {
    const meetingId = scopeKey.slice(8)
    return {
      kind: 'meeting',
      meetingId,
      label: 'Answering from this meeting',
      recordTitle: 'Loading meeting evidence',
      returnTo: returnTo ?? `/meetings/${meetingId}`,
    }
  }
  return corpusScopeFromKey(scopeKey)
}
