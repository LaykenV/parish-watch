import { expect, test, vi } from 'vitest'

import { cleanupStoredArtifacts } from './storageCleanup'

test('cleanup attempts every stored artifact and reports deletion failures', async () => {
  const remove = vi.fn(async (storageId: string) => {
    if (storageId === 'raw') {
      throw new Error('delete failed')
    }
  })

  const failures = await cleanupStoredArtifacts(['normalized', 'raw'], remove)

  expect(remove).toHaveBeenCalledTimes(2)
  expect(remove).toHaveBeenNthCalledWith(1, 'normalized')
  expect(remove).toHaveBeenNthCalledWith(2, 'raw')
  expect(failures).toEqual(['delete failed'])
})
