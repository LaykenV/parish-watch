import { expect, test, vi } from 'vitest'

import { canReachOrigin } from './hooks'

test('keeps the resident online when the origin answers', async () => {
  const request = vi.fn().mockResolvedValue({ status: 503 })

  await expect(canReachOrigin(request)).resolves.toBe(true)
  expect(request).toHaveBeenCalledWith('/brand-mark.svg', {
    cache: 'no-store',
    method: 'HEAD',
  })
})

test('confirms offline state only after the origin cannot answer', async () => {
  const request = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

  await expect(canReachOrigin(request)).resolves.toBe(false)
})
