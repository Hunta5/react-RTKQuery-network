import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureNetwork } from 'network/core/config/env'

// mock 下游 baseQueryWithRetry,让我们能控制每次返回
vi.mock('network/core/baseQuery/baseQueryWithRetry', () => ({
  baseQueryWithRetry: vi.fn(),
}))

import { baseQueryWithRetry } from 'network/core/baseQuery/baseQueryWithRetry'
import { baseQueryWithUnwrap } from 'network/core/baseQuery/baseQueryWithUnwrap'

const mocked = baseQueryWithRetry as unknown as ReturnType<typeof vi.fn>

describe('baseQueryWithUnwrap', () => {
  beforeEach(() => {
    mocked.mockReset()
    configureNetwork({
      baseUrl: 'http://test',
      maxRetries: 2,
      getAccessToken: () => null,
      reauth: {
        refreshToken: async () => 'new',
        onAuthFailure: () => {},
      },
    })
  })

  it('正常信封:code=0 → 剥壳返回 data', async () => {
    mocked.mockResolvedValueOnce({
      data: { code: 0, data: { id: '1' }, message: 'ok' },
    })

    const result = await baseQueryWithUnwrap('/x', {} as any, {})
    expect(result).toEqual({ data: { id: '1' } })
  })

  it('业务错误:code !== 0 → 转成 error + 带 message', async () => {
    mocked.mockResolvedValueOnce({
      data: { code: 1001, data: null, message: 'Not found' },
    })

    const result = await baseQueryWithUnwrap('/x', {} as any, {})
    expect(result.error).toBeDefined()
    const err = result.error as any
    expect(err.status).toBe(1001)
    expect(err.message).toBe('Not found')
  })

  it('skipUnwrap=true:不剥壳,原样返回整个信封', async () => {
    const raw = { code: 0, data: 'blob-bytes', message: 'ok' }
    mocked.mockResolvedValueOnce({ data: raw })

    const result = await baseQueryWithUnwrap('/x', {} as any, { skipUnwrap: true })
    expect(result).toEqual({ data: raw })
  })

  it('maxRetries 透传给 retry 层', async () => {
    mocked.mockResolvedValueOnce({ data: { code: 0, data: 'x' } })
    await baseQueryWithUnwrap('/x', {} as any, {})
    const extra = mocked.mock.calls[0][2]
    expect(extra.maxRetries).toBe(2)
  })

  it('endpoint 的 maxRetries 覆盖 config 默认值', async () => {
    mocked.mockResolvedValueOnce({ data: { code: 0, data: 'x' } })
    await baseQueryWithUnwrap('/x', {} as any, { maxRetries: 5 })
    const extra = mocked.mock.calls[0][2]
    expect(extra.maxRetries).toBe(5)
  })

  it('下游 error 带上 message(ensureErrorMessage 处理)', async () => {
    mocked.mockResolvedValueOnce({
      error: { status: 'TIMEOUT_ERROR', error: 'slow' },
    })

    const result = await baseQueryWithUnwrap('/x', {} as any, {})
    const err = result.error as any
    expect(err.message).toMatch(/timed out/i)
  })

  it('非信封格式原样返回', async () => {
    mocked.mockResolvedValueOnce({ data: 'plain-string' })

    const result = await baseQueryWithUnwrap('/x', {} as any, {})
    expect(result).toEqual({ data: 'plain-string' })
  })
})
