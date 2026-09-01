import { useMutation, useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import type { SavedAreaSlug, SavedTopicSlug } from './contracts'

export function useSavedSetup(enabled: boolean) {
  return useQuery(api.follows.savedSetup.current, enabled ? {} : 'skip')
}

export function useSavedSetupMutations() {
  const saveArea = useMutation(api.follows.savedSetup.saveArea)
  const removeArea = useMutation(api.follows.savedSetup.removeArea)
  const saveTopic = useMutation(api.follows.savedSetup.saveTopic)
  const removeTopic = useMutation(api.follows.savedSetup.removeTopic)

  return {
    removeArea: (area: SavedAreaSlug) => removeArea({ area }),
    removeTopic: (topic: SavedTopicSlug) => removeTopic({ topic }),
    saveArea: (area: SavedAreaSlug) => saveArea({ area }),
    saveTopic: (topic: SavedTopicSlug) => saveTopic({ topic }),
  }
}
