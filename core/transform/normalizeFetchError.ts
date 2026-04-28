import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

/**
 * fetchBaseQuery 的错误形态五花八门(status 可能是数字 HTTP 码,也可能是字符串如
 * 'FETCH_ERROR' / 'TIMEOUT_ERROR' / 'PARSING_ERROR'),组件里逐个判断很啰嗦。
 *
 * 这个函数统一塞一个 `message` 字段,组件只看 `error.message` 就够。
 * 已有 message 的(业务错误)不覆盖。
 */
export type NormalizedFetchError = FetchBaseQueryError & { message: string }

const STRING_STATUS_MESSAGES: Record<string, string> = {
  FETCH_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  PARSING_ERROR: 'Server returned an invalid response.',
  CUSTOM_ERROR: 'Unknown error.',
}

export function ensureErrorMessage(error: FetchBaseQueryError): NormalizedFetchError {
  const existing = (error as unknown as { message?: unknown }).message
  if (typeof existing === 'string' && existing.length > 0) {
    return error as NormalizedFetchError
  }

  if (typeof error.status === 'string') {
    const message =
      STRING_STATUS_MESSAGES[error.status] ??
      (error as { error?: string }).error ??
      'Unknown error.'
    return { ...error, message } as NormalizedFetchError
  }

  const status = error.status as number
  let message: string
  if (status >= 500) message = 'Server error. Please try again later.'
  else if (status === 401) message = 'Unauthorized.'
  else if (status === 403) message = 'You do not have permission to perform this action.'
  else if (status === 404) message = 'Resource not found.'
  else if (status >= 400) message = 'Request failed.'
  else message = `Request failed (status ${status}).`

  return { ...error, message } as NormalizedFetchError
}
