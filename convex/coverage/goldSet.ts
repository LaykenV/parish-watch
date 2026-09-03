import manifest from '../../docs/coverage-gold-sets/launch-bodies.v1.json'

import type { SourceKind } from '../pipeline/state'

export type CoverageSampleSlot = {
  sourceKinds: SourceKind[]
  role: 'current' | 'historical' | 'revision' | 'negative'
}

export function coverageGoldSetSlots(bodyKey: string): CoverageSampleSlot[] {
  const body = manifest.bodies.find((entry) => entry.bodyKey === bodyKey)
  if (!body) throw new Error(`The coverage gold set has no body ${bodyKey}.`)
  const definitions = [
    ...manifest.commonSlots,
    ...(body.planning ? manifest.planningSlots : []),
  ]
  const slots: CoverageSampleSlot[] = []
  for (const definition of definitions) {
    const sourceKinds = sourceKindsFor(definition.sourceKind)
    for (let index = 0; index < definition.count; index += 1) {
      slots.push({
        sourceKinds,
        role: roleFor(definition.role, index),
      })
    }
  }
  if (body.planning) {
    const planningSlots = slots.filter((slot) =>
      slot.sourceKinds.includes('planning_case'),
    )
    if (planningSlots.length < 2) {
      throw new Error('Planning bodies need current and historical case slots.')
    }
  }
  return slots
}

export function coverageGoldSetVersion(): string {
  return manifest.version
}

function sourceKindsFor(value: string): SourceKind[] {
  switch (value) {
    case 'agenda':
      return ['agenda', 'packet']
    case 'minutes':
      return ['minutes']
    case 'ordinance_or_resolution':
      return ['ordinance', 'resolution']
    case 'planning_case':
      return ['planning_case']
    case 'revision':
    case 'other':
      return ['other']
    default:
      throw new Error(`Unknown coverage sample kind ${value}.`)
  }
}

function roleFor(value: string, index: number): CoverageSampleSlot['role'] {
  switch (value) {
    case 'current':
    case 'decision':
      return 'current'
    case 'case_or_zoning_record':
      return index === 0 ? 'current' : 'historical'
    case 'current_or_historical':
      return index === 0 ? 'current' : 'historical'
    case 'revision_or_cancellation':
      return 'revision'
    case 'negative':
      return 'negative'
    default:
      throw new Error(`Unknown coverage sample role ${value}.`)
  }
}
