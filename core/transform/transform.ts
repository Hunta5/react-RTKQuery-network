// src/services/api/transform.ts
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/**
 * 后端统一格式 { code, data, message }
 * code !== 0 视为业务错误，转成 TS 抛异常（会被 transformErrorResponse 捕获）
 */
export function unwrap<T>(resp: ApiResponse<T>): T {
  if (resp.code !== 0) {
    throw { status: resp.code, data: resp }
  }
  return resp.data
}

export interface NormalizedError {
  status: number | string
  message: string
  code?: number
}

export function normalizeError(err: any): NormalizedError {
  return {
    status: err?.status ?? 'UNKNOWN',
    message: err?.data?.message ?? err?.message ?? 'unknown error',
    code: err?.data?.code,
  }
}
