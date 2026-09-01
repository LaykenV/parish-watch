import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexReactClient } from 'convex/react'

import { api } from '../../../convex/_generated/api'

const convexUrl = import.meta.env.VITE_CONVEX_URL

function createClients(url: string) {
  const convexClient = new ConvexReactClient(url)
  const convexQueryClient = new ConvexQueryClient(convexClient)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })

  convexQueryClient.connect(queryClient)

  return { convexClient, queryClient }
}

const clients = convexUrl ? createClients(convexUrl) : null

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!clients) {
    return (
      <main className="configuration-error">
        <p className="eyebrow">Setup needed</p>
        <h1>Convex is not configured.</h1>
        <p>
          Run <code>npx convex dev</code> to create <code>.env.local</code>,
          then restart the web server.
        </p>
      </main>
    )
  }

  return (
    <ConvexAuthProvider
      api={{
        refreshSession: api.auth.refreshSession,
        signOut: api.auth.signOut,
      }}
      client={clients.convexClient}
    >
      <QueryClientProvider client={clients.queryClient}>
        {children}
      </QueryClientProvider>
    </ConvexAuthProvider>
  )
}
