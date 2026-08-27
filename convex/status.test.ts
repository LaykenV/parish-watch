/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

test('reports that the Convex backend is ready', async () => {
  const t = convexTest(schema, modules)

  await expect(t.query(api.system.status.readiness, {})).resolves.toEqual({
    application: 'Public Parish',
    backend: 'convex',
    state: 'ready',
  })
})
