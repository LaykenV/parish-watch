import { defineConfig } from 'vite'

// Serve the same static files uploaded to Convex hosting, without the Start server.
export default defineConfig({ build: { outDir: 'dist/client' } })
