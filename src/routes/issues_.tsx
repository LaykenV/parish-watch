import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/issues_')({
  beforeLoad: () => {
    throw redirect({ hash: 'current-issues', replace: true, to: '/' })
  },
})
