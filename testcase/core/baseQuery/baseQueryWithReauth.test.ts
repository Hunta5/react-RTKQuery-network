import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock rawBaseQuery,控制每次返回
vi.mock('network/core/baseQuery/baseQuery', () => ({
  rawBaseQuery: vi.fn(),
}))

import { rawBaseQuery } from 'network/core/baseQuery/baseQuery'
import { baseQueryWithReauth } from 'network/core/baseQuery/baseQueryWithReauth'
import { configureNetwork } from 'network/core/config/env'

const mockedRaw = rawBaseQuery as unknown as ReturnType<typeof vi.fn>

describe('baseQueryWithReauth', () => {
  let refreshToken: ReturnType<typeof vi.fn>
  let onAuthFailure: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockedRaw.mockReset()
    refreshToken = vi.fn()
    onAuthFailure = vi.fn()

    configureNetwork({
      baseUrl: 'http://test',
      getAccessToken: () => 'token',
      reauth: {
        refreshToken,
        onAuthFailure,
      },
    })
  })

  it('正常请求 2xx 直接透传,不触发刷新', async () => {
    mockedRaw.mockResolvedValueOnce({ data: { ok: true } })

    const result = await baseQueryWithReauth('/x', {} as any, {})

    expect(result).toEqual({ data: { ok: true } })
    expect(refreshToken).not.toHaveBeenCalled()
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('401 → 刷新成功 → 重放原请求', async () => {
    mockedRaw
      .mockResolvedValueOnce({ error: { status: 401, data: {} } }) // 首次 401
      .mockResolvedValueOnce({ error: { status: 401, data: {} } }) // 锁内重试仍 401
      .mockResolvedValueOnce({ data: { ok: true } })               // refreshToken 后 replay 成功

    refreshToken.mockResolvedValueOnce('new-token')

    const result = await baseQueryWithReauth('/x', {} as any, {})

    expect(refreshToken).toHaveBeenCalledOnce()
    expect(onAuthFailure).not.toHaveBeenCalled()
    expect(result).toEqual({ data: { ok: true } })
  })

  it('401 → 刷新失败 → 调 onAuthFailure,返回 401 error', async () => {
    mockedRaw
      .mockResolvedValueOnce({ error: { status: 401, data: {} } })
      .mockResolvedValueOnce({ error: { status: 401, data: {} } })

    refreshToken.mockRejectedValueOnce(new Error('NO_REFRESH_TOKEN'))

    const result = await baseQueryWithReauth('/x', {} as any, {})

    expect(refreshToken).toHaveBeenCalledOnce()
    expect(onAuthFailure).toHaveBeenCalledOnce()
    expect((result.error as any).status).toBe(401)
  })

  it('锁内重试:抢锁后发现别人已经刷过(不再 401),直接返回,不触发新刷新', async () => {
    mockedRaw
      .mockResolvedValueOnce({ error: { status: 401, data: {} } })   // 首次 401
      .mockResolvedValueOnce({ data: { ok: true } })                  // 抢锁后 retry,已成功

    const result = await baseQueryWithReauth('/x', {} as any, {})

    expect(refreshToken).not.toHaveBeenCalled()
    expect(result).toEqual({ data: { ok: true } })
  })

  it('并发 401:mutex 确保 refreshToken 只调一次', async () => {
    let refreshResolveHold: () => void
    const refreshHold = new Promise<string>((resolve) => {
      refreshResolveHold = () => resolve('new-token')
    })
    refreshToken.mockReturnValueOnce(refreshHold)

    // 所有 raw 调用首次都返回 401,之后(有新 token 重放时)返回成功
    let callCount = 0
    mockedRaw.mockImplementation(async () => {
      callCount++
      // 前面几次 401,后续 replay 成功
      if (callCount <= 4) return { error: { status: 401, data: {} } }
      return { data: { ok: true } }
    })

    const [r1, r2, r3] = await Promise.all([
      Promise.resolve().then(() => {
        // 触发第一个 401 → 抢锁 → 开始 refresh → 等 refreshHold
        return baseQueryWithReauth('/a', {} as any, {})
      }),
      Promise.resolve().then(async () => {
        // 让 r1 先起跑拿到锁
        await new Promise((r) => setTimeout(r, 5))
        return baseQueryWithReauth('/b', {} as any, {})
      }),
      Promise.resolve().then(async () => {
        await new Promise((r) => setTimeout(r, 10))
        return baseQueryWithReauth('/c', {} as any, {})
      }),
    ].map(async (p, i) => {
      if (i === 0) {
        // 延迟一点解锁 refresh
        setTimeout(() => refreshResolveHold!(), 20)
      }
      return p
    }))

    // refreshToken 只被调一次
    expect(refreshToken).toHaveBeenCalledOnce()
  })
})
