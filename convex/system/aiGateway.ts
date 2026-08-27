import { getServiceToken } from 'convex/server'
import { v } from 'convex/values'

import { internalAction } from '../_generated/server'

const modelListValidator = v.object({
  available: v.array(v.string()),
  missing: v.array(v.string()),
})

type GatewayModel = {
  id: string
}

function readModelIds(value: unknown): string[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value) ||
    !Array.isArray(value.data)
  ) {
    throw new Error('AI Gateway returned an invalid model list')
  }

  return value.data
    .filter(
      (model): model is GatewayModel =>
        typeof model === 'object' &&
        model !== null &&
        'id' in model &&
        typeof model.id === 'string',
    )
    .map((model) => model.id)
}

// Manual operations probe. Run it from the Convex CLI when gateway availability
// or the planned model IDs need to be checked; product code does not call it.
export const checkModels = internalAction({
  args: { modelIds: v.array(v.string()) },
  returns: modelListValidator,
  handler: async (_ctx, args) => {
    const token = await getServiceToken('ai-gateway')
    const response = await fetch('https://ai-gateway.convex.dev/v1/models', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new Error(`AI Gateway model check failed with ${response.status}`)
    }

    const availableIds = new Set(readModelIds(await response.json()))
    const available = args.modelIds.filter((modelId) =>
      availableIds.has(modelId),
    )
    const missing = args.modelIds.filter(
      (modelId) => !availableIds.has(modelId),
    )

    return { available, missing }
  },
})
