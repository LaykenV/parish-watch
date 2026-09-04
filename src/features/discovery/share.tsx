import { CheckIcon, ShareIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'

type ShareButtonProps = {
  className?: string
  label?: string
  path: string
  title: string
}

export function ShareButton({
  className,
  label = 'Share',
  path,
  title,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [failedUrl, setFailedUrl] = useState('')
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const share = async () => {
    const backend = import.meta.env.VITE_CONVEX_URL as string | undefined
    const base = path.startsWith('/issues/') && backend ? backend.replace(/\.convex\.cloud\/?$/, '.convex.site') : window.location.origin
    const sharePath = path.startsWith('/issues/') ? `/share${path}` : path
    const url = `${base}${sharePath}`
    setFailedUrl('')

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        // Fall through to copy when the system sheet cannot open.
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setFailedUrl(url)
    }
  }

  return (
    <>
    <Button
      className={cn('pp-inline-action', className)}
      data-copied={copied || undefined}
      onClick={share}
      size="touch"
      variant="outline"
    >
      {copied ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <ShareIcon aria-hidden="true" />
      )}
      <span>{label}</span>
      <span aria-live="polite" className="visually-hidden">
        {copied ? 'Link copied' : ''}
      </span>
    </Button>
    {failedUrl ? <span role="status">Copy this link: <a href={failedUrl}>{failedUrl}</a></span> : null}
    </>
  )
}
