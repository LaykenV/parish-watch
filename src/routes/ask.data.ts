import {
  corpusScopeFromKey,
  defaultAskScenario,
  routeSearchFromScopeKey,
} from '../features/ask/contracts'
import type {
  AskAvailability,
  AskScenario,
  AskScope,
} from '../features/ask/contracts'

/*
  Route-level data contract for /ask. The page projection is owned by a typed
  adapter: production without a proven chat adapter resolves the honest
  unavailable availability, and development scenarios resolve through the
  dev-only fixture adapter, which this module loads by dynamic import only.
*/

export type AskRouteData = {
  availability: AskAvailability
  scenario: AskScenario | null
  scope: AskScope
}

export async function loadAskPageData(
  fixture: AskScenario | undefined,
  scopeKey: string,
): Promise<AskRouteData> {
  if (!import.meta.env.DEV) {
    return {
      availability: { kind: 'unavailable' },
      scenario: null,
      scope: corpusScopeFromKey(scopeKey),
    }
  }

  // This gate has to agree with askCanAnswer, which the record pages use to
  // decide whether to offer a composer at all. A visit that resolves
  // unavailable here while the blocks still invite a question would drop it.
  const scenario = fixture ?? defaultAskScenario(scopeKey)
  const { getAskFixtureAdapter } = await import('../features/ask/fixtures')
  const adapter = getAskFixtureAdapter(scenario)
  const scope = await adapter.resolveScope(routeSearchFromScopeKey(scopeKey))

  return { availability: { kind: 'available' }, scenario, scope }
}
