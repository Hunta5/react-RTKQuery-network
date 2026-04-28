import { describe, it, expect } from 'vitest'
import { ensureErrorMessage } from 'network/core/transform/normalizeFetchError'

describe('ensureErrorMessage', () => {
  it('已有 message 的不动(幂等)', () => {
    const input = { status: 500, data: {}, message: 'already set' } as any
    const out = ensureErrorMessage(input)
    expect(out.message).toBe('already set')
  })

  it('再调一次仍返回同 message(幂等)', () => {
    const base = ensureErrorMessage({ status: 'TIMEOUT_ERROR', error: 'x' } as any)
    const second = ensureErrorMessage(base)
    expect(second.message).toBe(base.message)
  })

  it('FETCH_ERROR 翻译成网络错误文案', () => {
    const out = ensureErrorMessage({ status: 'FETCH_ERROR', error: 'Failed' } as any)
    expect(out.message).toMatch(/network/i)
  })

  it('TIMEOUT_ERROR 翻译成超时文案', () => {
    const out = ensureErrorMessage({ status: 'TIMEOUT_ERROR', error: 'x' } as any)
    expect(out.message).toMatch(/timed out/i)
  })

  it('HTTP 500+ 翻译成服务器错误', () => {
    const out = ensureErrorMessage({ status: 500, data: {} } as any)
    expect(out.message).toMatch(/server/i)
  })

  it('HTTP 403 翻译成无权限', () => {
    const out = ensureErrorMessage({ status: 403, data: {} } as any)
    expect(out.message).toMatch(/permission/i)
  })

  it('HTTP 404 翻译成资源找不到', () => {
    const out = ensureErrorMessage({ status: 404, data: {} } as any)
    expect(out.message).toMatch(/not found/i)
  })

  it('未知字符串 status 有兜底', () => {
    const out = ensureErrorMessage({ status: 'WEIRD_STATUS', error: 'boom' } as any)
    expect(out.message).toBeTruthy()
  })
})
