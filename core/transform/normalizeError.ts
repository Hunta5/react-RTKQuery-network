import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

/**
 * 组件级错误分类。比 FetchBaseQueryError 的裸 status 好判断:
 *
 *   const err = normalizeError(error)
 *   if (err.kind === 'business') { ... showFormError(err.code, err.message) }
 *   if (err.kind === 'network') { ... showOfflineBanner() }
 */
export type NormalizedError =
  | { kind: 'business'; code: number; message: string; raw: unknown }
  | { kind: 'http'; status: number; message: string; raw?: unknown }
  | { kind: 'maintenance'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'parse'; message: string }
  | { kind: 'unknown'; message: string }

type AnyError = FetchBaseQueryError | SerializedError | undefined | null

export function normalizeError(error: AnyError): NormalizedError {
  if (!error) return { kind: 'unknown', message: 'Unknown error.' }

  if (isSerializedError(error)) {
    return { kind: 'unknown', message: error.message ?? 'Unknown error.' }
  }

  const message =
    (error as { message?: unknown }).message as string | undefined ??
    'Request failed.'

  if (typeof error.status === 'string') {
    switch (error.status) {
      case 'FETCH_ERROR':   return { kind: 'network', message }
      case 'TIMEOUT_ERROR': return { kind: 'timeout', message }
      case 'PARSING_ERROR': return { kind: 'parse',   message }
      default:              return { kind: 'unknown', message }
    }
  }

  const status = error.status
  if (status === 503) {
    return { kind: 'maintenance', message }
  }

  // 业务错误:通常 code 是自定义范围(如 1001+),HTTP 是 4xx/5xx 标准码
  if (status >= 1000) {
    return { kind: 'business', code: status, message, raw: error.data }
  }

  return { kind: 'http', status, message, raw: error.data }
}

function isSerializedError(e: unknown): e is SerializedError {
  return (
    typeof e === 'object' &&
    e !== null &&
    !('status' in (e as object))
  )
}
