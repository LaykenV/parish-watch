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
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const share = async () => {
    const url = `${window.location.origin}${path}`

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
      // Clipboard access denied. The control stays quiet rather than faking success.
    }
  }

  return (
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
  )
}
