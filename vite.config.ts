import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'

const config = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const convexUrl = Object.hasOwn(env, 'VITE_CONVEX_URL')
    ? env.VITE_CONVEX_URL
    : ''

  if (command === 'build' && !convexUrl.trim()) {
    throw new Error(
      'VITE_CONVEX_URL is required for production builds. Run `npx convex dev --once` or set it in the build environment.',
    )
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      wgslVitePlugin(),
      tanstackStart({
        spa: {
          enabled: true,
          prerender: {
            outputPath: '/index.html',
          },
        },
      }),
      viteReact(),
    ],
  }
})

export default config
