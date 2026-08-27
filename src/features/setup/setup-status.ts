export function describeBackendState(state: 'ready' | undefined) {
  return state === 'ready' ? 'Convex connected' : 'Connecting to Convex'
}
