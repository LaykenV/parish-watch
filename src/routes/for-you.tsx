import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/for-you')({
  beforeLoad: () => {
    throw redirect({ replace: true, to: '/' })
  },
})
