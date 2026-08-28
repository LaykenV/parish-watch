import { defineConfig } from 'vitest/config'

// @convex-dev/workflow's setupEnvironment patches Math/Date/console and then
// deletes process, crypto, and friends from the shared vitest edge-runtime
// global while a workflow mutation runs, restoring them when it finishes. The
// real Convex runtime has no such globals in mutations, but the vitest
// environment and convex-test do and depend on them, so the deletes break
// convex-test mid-workflow and the restore throws on edge-runtime's
// getter-only globals. This plugin replaces the module with a no-op shim
// under tests only; production behavior is untouched.
const neutralizeWorkflowEnvironmentPatch = () => ({
  name: 'neutralize-workflow-environment-patch',
  enforce: 'pre' as const,
  load(id: string) {
    if (id.includes('@convex-dev/workflow') && id.endsWith('environment.js')) {
      return {
        code: [
          'export function setupEnvironment(_getGenerationState, _workflowId) {',
          '  return () => {};',
          '}',
          '',
        ].join('\n'),
        map: null,
      }
    }
    return null
  },
})

export default defineConfig({
  plugins: [neutralizeWorkflowEnvironmentPatch()],
  test: {
    environment: 'edge-runtime',
    server: {
      deps: {
        inline: [/@convex-dev\/workflow/],
      },
    },
  },
})
