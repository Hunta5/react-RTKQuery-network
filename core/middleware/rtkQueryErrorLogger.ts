import { Middleware, isPending, isFulfilled, isRejected } from '@reduxjs/toolkit'
import { getNetworkConfig } from '../config/env'
import { normalizeError } from '../transform/normalizeError'

const timings = new Map<string, { start: number; endpoint: string; arg: unknown }>()

const STYLE = {
  pending: 'color: #3b82f6; font-weight: bold',
  success: 'color: #22c55e; font-weight: bold',
  error:   'color: #ef4444; font-weight: bold',
  muted:   'color: #94a3b8',
  tag:     'background: #1e293b; color: #e2e8f0; padding: 2px 6px; border-radius: 3px',
}

// 高频轮询或不想刷屏的 endpoint,加进来不打日志
const IGNORE_ENDPOINTS = new Set<string>([
  'unknown',
])

// 这些 kind 由别的层处理,不走 onGlobalError:
// - business  → 组件自己处理(表单校验、业务流程)
// - http 401  → reauth 已经处理
// - http 4xx  → 组件处理
// - unknown 且无 message → 静默(通常是 SerializedError 比如 AbortController)
const SHOULD_GLOBAL_NOTIFY = (kind: string, status?: number) => {
  if (kind === 'network' || kind === 'timeout' || kind === 'maintenance' || kind === 'parse') return true
  if (kind === 'http' && typeof status === 'number' && status >= 500) return true
  return false
}

export const rtkQueryLogger: Middleware = () => (next) => (action) => {
  if (!action.type?.startsWith('api/execute')) return next(action)

  const meta = action.meta as any
  const endpointName = meta?.arg?.endpointName ?? 'unknown'
  const requestId: string = meta?.requestId
  const arg = meta?.arg?.originalArgs ?? meta?.arg

  if (IGNORE_ENDPOINTS.has(endpointName)) return next(action)

  const isMutation = action.type.startsWith('api/executeMutation')
  const kind = isMutation ? 'MUTATION' : 'QUERY'

  if (isPending(action)) {
    timings.set(requestId, { start: performance.now(), endpoint: endpointName, arg })
    if (process.env.NODE_ENV !== 'production') {
      console.groupCollapsed(
        `%c${kind}%c → %c${endpointName}`,
        STYLE.tag, STYLE.muted, STYLE.pending,
      )
      console.log('%cargs:', STYLE.muted, arg)
      console.log('%crequestId:', STYLE.muted, requestId)
      console.groupEnd()
    }
  } else if (isFulfilled(action)) {
    const info = timings.get(requestId)
    const duration = info ? (performance.now() - info.start).toFixed(0) : '?'
    timings.delete(requestId)

    if (process.env.NODE_ENV !== 'production') {
      console.groupCollapsed(
        `%c${kind}%c ✓ %c${endpointName} %c${duration}ms`,
        STYLE.tag, STYLE.success, STYLE.success, STYLE.muted,
      )
      console.log('%cargs:', STYLE.muted, info?.arg)
      console.log('%cresponse:', STYLE.muted, action.payload)
      console.groupEnd()
    }
  } else if (isRejected(action)) {
    const info = timings.get(requestId)
    const duration = info ? (performance.now() - info.start).toFixed(0) : '?'
    timings.delete(requestId)

    const err = normalizeError(action.payload as any)

    if (process.env.NODE_ENV !== 'production') {
      console.groupCollapsed(
        `%c${kind}%c ✗ %c${endpointName} %c${duration}ms`,
        STYLE.tag, STYLE.error, STYLE.error, STYLE.muted,
      )
      console.log('%cargs:', STYLE.muted, info?.arg)
      console.log('%cnormalized:', STYLE.muted, err)
      console.log('%craw:', STYLE.muted, action.payload ?? action.error)
      console.groupEnd()
    }

    if (SHOULD_GLOBAL_NOTIFY(err.kind, (err as any).status)) {
      try {
        getNetworkConfig().onGlobalError?.(err)
      } catch (e) {
        console.error('[network] onGlobalError threw:', e)
      }
    }
  }

  return next(action)
}
