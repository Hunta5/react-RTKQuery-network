import { describe, it, expect } from 'vitest'
import { providesList } from 'network/core/tags/providesList'

describe('providesList', () => {
  const provider = providesList('Order')

  it('undefined → 只打 LIST tag', () => {
    expect(provider(undefined)).toEqual([{ type: 'Order', id: 'LIST' }])
  })

  it('[] → 只打 LIST tag', () => {
    expect(provider([])).toEqual([{ type: 'Order', id: 'LIST' }])
  })

  it('正常数组 → 每条 item + LIST', () => {
    const result = provider([{ id: '1' }, { id: '2' }])
    expect(result).toEqual([
      { type: 'Order', id: '1' },
      { type: 'Order', id: '2' },
      { type: 'Order', id: 'LIST' },
    ])
  })

  it('number id 也支持', () => {
    const result = provider([{ id: 1 }, { id: 2 }])
    expect(result).toEqual([
      { type: 'Order', id: 1 },
      { type: 'Order', id: 2 },
      { type: 'Order', id: 'LIST' },
    ])
  })

  it('type 参数被正确捕获', () => {
    const userList = providesList('User')
    const result = userList([{ id: 'u1' }])
    expect(result[0]).toEqual({ type: 'User', id: 'u1' })
  })
})
