import { describe, it, expect } from 'vitest'
import { normalizeError } from 'network/core/transform/normalizeError'

describe('normalizeError', () => {
  it('null / undefined → unknown', () => {
    expect(normalizeError(null).kind).toBe('unknown')
    expect(normalizeError(undefined).kind).toBe('unknown')
  })

  it('FETCH_ERROR → network', () => {
    const e = normalizeError({ status: 'FETCH_ERROR', error: 'x', message: 'offline' } as any)
    expect(e.kind).toBe('network')
    expect(e.message).toBe('offline')
  })

  it('TIMEOUT_ERROR → timeout', () => {
    const e = normalizeError({ status: 'TIMEOUT_ERROR', error: 'x', message: 'slow' } as any)
    expect(e.kind).toBe('timeout')
  })

  it('PARSING_ERROR → parse', () => {
    const e = normalizeError({ status: 'PARSING_ERROR', error: 'x', message: 'bad json' } as any)
    expect(e.kind).toBe('parse')
  })

  it('503 → maintenance', () => {
    const e = normalizeError({ status: 503, data: {}, message: 'down' } as any)
    expect(e.kind).toBe('maintenance')
  })

  it('code >= 1000 → business', () => {
    const e = normalizeError({ status: 1001, data: { code: 1001 }, message: 'not found' } as any)
    expect(e.kind).toBe('business')
    if (e.kind === 'business') {
      expect(e.code).toBe(1001)
      expect(e.message).toBe('not found')
    }
  })

  it('HTTP 5xx → http', () => {
    const e = normalizeError({ status: 500, data: {}, message: 'oops' } as any)
    expect(e.kind).toBe('http')
    if (e.kind === 'http') expect(e.status).toBe(500)
  })

  it('HTTP 4xx → http', () => {
    const e = normalizeError({ status: 404, data: {}, message: 'nope' } as any)
    expect(e.kind).toBe('http')
    if (e.kind === 'http') expect(e.status).toBe(404)
  })

  it('SerializedError(无 status) → unknown', () => {
    const e = normalizeError({ name: 'AbortError', message: 'Aborted' } as any)
    expect(e.kind).toBe('unknown')
    expect(e.message).toBe('Aborted')
  })

  it('无 message 时有默认文案', () => {
    const e = normalizeError({ status: 500, data: {} } as any)
    expect(e.message).toBeTruthy()
  })
})
