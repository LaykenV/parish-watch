import { useEffect, useRef, useState } from 'react'
import { effect, frame, init, surface } from 'vgpu'
import type { Effect, Gpu, Surface } from 'vgpu'

import reliefShader from './louisiana-relief.wgsl'
import { LOUISIANA_OUTLINE_PATH } from './louisiana-path'

import './louisiana-relief.css'

type RenderState = 'loading' | 'ready' | 'fallback'

export function LouisianaRelief() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [renderState, setRenderState] = useState<RenderState>('loading')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !('gpu' in navigator)) {
      setRenderState('fallback')
      return
    }
    const interactionSurface =
      canvas.closest<HTMLElement>('[data-relief-interaction]') ?? canvas

    const lifecycle = { disposed: false }
    let gpu: Gpu | undefined
    let canvasSurface: Surface | undefined
    let relief: Effect | undefined
    let animationFrame = 0
    let animationTimer = 0
    let visible = true
    let lastFrameAt = performance.now()
    const startedAt = performance.now()
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const hasFinePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches
    const motionEnabled = !reducedMotion && hasFinePointer
    const motion = {
      yaw: 0,
      pitch: -0.03,
      energy: 0,
      targetYaw: 0,
      targetPitch: -0.03,
      targetEnergy: 0,
    }

    const render = (timestamp: number) => {
      if (!gpu || !canvasSurface || !relief || lifecycle.disposed) return
      frame(gpu, (currentFrame) => {
        relief?.set({
          params: {
            resolution: canvasSurface?.size ?? [1, 1],
            yaw: motion.yaw,
            pitch: motion.pitch,
            time: motionEnabled ? (timestamp - startedAt) / 1000 : 0,
            energy: motion.energy,
          },
        })
        if (canvasSurface && relief) currentFrame.pass(canvasSurface, relief)
      })
    }

    const animate = (timestamp: number) => {
      animationFrame = 0
      if (lifecycle.disposed || !visible) return

      const elapsed = Math.min((timestamp - lastFrameAt) / 1000, 0.1)
      lastFrameAt = timestamp
      const easing = 1 - Math.exp(-elapsed * 10)
      motion.yaw += (motion.targetYaw - motion.yaw) * easing
      motion.pitch += (motion.targetPitch - motion.pitch) * easing
      motion.energy += (motion.targetEnergy - motion.energy) * easing

      const settling =
        Math.abs(motion.targetYaw - motion.yaw) > 0.0005 ||
        Math.abs(motion.targetPitch - motion.pitch) > 0.0005 ||
        Math.abs(motion.targetEnergy - motion.energy) > 0.001

      render(timestamp)

      if (motionEnabled) {
        scheduleAnimation(false, settling ? 16 : 66)
      }
    }

    const scheduleAnimation = (immediate = true, delay = 0) => {
      if (lifecycle.disposed || !visible) return
      if (immediate && animationTimer) {
        window.clearTimeout(animationTimer)
        animationTimer = 0
      }
      if (animationFrame || animationTimer) return
      if (immediate) {
        animationFrame = requestAnimationFrame(animate)
        return
      }
      animationTimer = window.setTimeout(() => {
        animationTimer = 0
        if (!lifecycle.disposed && visible) {
          animationFrame = requestAnimationFrame(animate)
        }
      }, delay)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!motionEnabled || event.pointerType === 'touch') return
      const bounds = interactionSurface.getBoundingClientRect()
      const pointerX = (event.clientX - bounds.left) / bounds.width - 0.5
      const pointerY = (event.clientY - bounds.top) / bounds.height - 0.5
      motion.targetYaw = pointerX * 0.16
      motion.targetPitch = -0.03 + pointerY * 0.09
      motion.targetEnergy = 1
      scheduleAnimation()
    }

    const handlePointerLeave = () => {
      motion.targetYaw = 0
      motion.targetPitch = -0.03
      motion.targetEnergy = 0
      scheduleAnimation()
    }

    const resizeObserver = new ResizeObserver(() => scheduleAnimation())
    resizeObserver.observe(canvas)
    if (motionEnabled) {
      interactionSurface.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      })
      interactionSurface.addEventListener('pointerleave', handlePointerLeave, {
        passive: true,
      })
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) {
          scheduleAnimation()
        } else if (animationFrame) {
          cancelAnimationFrame(animationFrame)
          animationFrame = 0
        }
        if (!visible && animationTimer) {
          window.clearTimeout(animationTimer)
          animationTimer = 0
        }
      },
      { threshold: 0.05 },
    )
    visibilityObserver.observe(canvas)

    void (async () => {
      try {
        const nextGpu = await init()
        if (lifecycle.disposed) {
          nextGpu.dispose()
          return
        }
        gpu = nextGpu
        canvasSurface = surface(nextGpu, canvas, {
          dpr: [1, 1.25],
          label: 'Public Parish Louisiana relief',
        })
        relief = effect(nextGpu, reliefShader, {
          label: 'Louisiana relief shader',
          set: {
            params: {
              resolution: canvasSurface.size,
              yaw: motion.yaw,
              pitch: motion.pitch,
              time: 0,
              energy: 0,
            },
          },
        })
        render(performance.now())
        setRenderState('ready')
        if (motionEnabled) scheduleAnimation(false, 66)
      } catch {
        if (!lifecycle.disposed) setRenderState('fallback')
      }
    })()

    return () => {
      lifecycle.disposed = true
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      if (motionEnabled) {
        interactionSurface.removeEventListener('pointermove', handlePointerMove)
        interactionSurface.removeEventListener(
          'pointerleave',
          handlePointerLeave,
        )
      }
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (animationTimer) window.clearTimeout(animationTimer)
      canvasSurface?.dispose()
      gpu?.dispose()
    }
  }, [])

  return (
    <div className="relief-viewport" data-render-state={renderState}>
      <canvas
        aria-label="Three-dimensional Louisiana relief with static pins marking Lafayette, Rapides, and East Baton Rouge as planned launch regions"
        className="relief-canvas"
        ref={canvasRef}
        role="img"
      />
      <div aria-hidden="true" className="relief-map-labels">
        <span className="relief-map-label relief-map-label-rapides">
          Rapides
        </span>
        <span className="relief-map-label relief-map-label-lafayette">
          Lafayette
        </span>
        <span className="relief-map-label relief-map-label-baton-rouge">
          East Baton Rouge
        </span>
      </div>
      <svg aria-hidden="true" className="relief-fallback" viewBox="0 0 260 240">
        <path className="relief-fallback-state" d={LOUISIANA_OUTLINE_PATH} />
        <g className="relief-fallback-pins">
          <g transform="translate(100 157)">
            <path d="M0 8c-1.5-2.2-6-7.1-6-11.5a6 6 0 1 1 12 0C6 .9 1.5 5.8 0 8Z" />
            <circle cy="-3.5" r="2" />
          </g>
          <g transform="translate(81 100)">
            <path d="M0 8c-1.5-2.2-6-7.1-6-11.5a6 6 0 1 1 12 0C6 .9 1.5 5.8 0 8Z" />
            <circle cy="-3.5" r="2" />
          </g>
          <g transform="translate(142 146)">
            <path d="M0 8c-1.5-2.2-6-7.1-6-11.5a6 6 0 1 1 12 0C6 .9 1.5 5.8 0 8Z" />
            <circle cy="-3.5" r="2" />
          </g>
        </g>
      </svg>
      <p className="relief-fallback-note">
        Interactive relief requires WebGPU.
      </p>
    </div>
  )
}
