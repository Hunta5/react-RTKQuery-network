import { describe, it, expect, vi } from 'vitest'
import AuthStorage from 'network/core/storage/authStorage'

describe('AuthStorage', () => {
  describe('access token', () => {
    it('set + get', () => {
      AuthStorage.setAccessToken('abc')
      expect(AuthStorage.getAccessToken()).toBe('abc')
    })

    it('setAccessToken(undefined) 会清除', () => {
      AuthStorage.setAccessToken('abc')
      AuthStorage.setAccessToken(undefined)
      expect(AuthStorage.getAccessToken()).toBeNull()
    })
  })

  describe('refresh token', () => {
    it('set + get', () => {
      AuthStorage.setRefreshToken('refresh-xyz')
      expect(AuthStorage.getRefreshToken()).toBe('refresh-xyz')
    })
  })

  describe('profile', () => {
    it('set + get', () => {
      const profile = { id: '1', name: 'Alice', email: 'a@example.com' }
      AuthStorage.setProfile(profile)
      expect(AuthStorage.getProfile()).toEqual(profile)
    })

    it('getProfile 容错 localStorage 非 JSON', () => {
      localStorage.setItem('user_profile', 'not-json')
      expect(AuthStorage.getProfile()).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('无 token → false', () => {
      expect(AuthStorage.isAuthenticated()).toBe(false)
    })

    it('有 token → true', () => {
      AuthStorage.setAccessToken('t')
      expect(AuthStorage.isAuthenticated()).toBe(true)
    })
  })

  describe('loginSuccess', () => {
    it('写入 token + refreshToken + profile 并触发 auth:login', () => {
      const handler = vi.fn()
      const off = AuthStorage.events.on('auth:login', handler)

      const profile = { id: '1', name: 'A', email: 'a@b.c' }
      AuthStorage.loginSuccess({
        accessToken: 'access',
        refreshToken: 'refresh',
        profile,
      })

      expect(AuthStorage.getAccessToken()).toBe('access')
      expect(AuthStorage.getRefreshToken()).toBe('refresh')
      expect(AuthStorage.getProfile()).toEqual(profile)
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith({ profile })

      off()
    })

    it('不传 refreshToken 也能工作', () => {
      AuthStorage.loginSuccess({
        accessToken: 'a',
        profile: { id: '1', name: 'A', email: 'a@b.c' },
      })
      expect(AuthStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('logout / clear', () => {
    it('logout 清所有 + 触发 auth:cleared reason=logout', () => {
      AuthStorage.loginSuccess({
        accessToken: 'a',
        refreshToken: 'r',
        profile: { id: '1', name: 'A', email: 'a@b.c' },
      })

      const handler = vi.fn()
      const off = AuthStorage.events.on('auth:cleared', handler)

      AuthStorage.logout()

      expect(AuthStorage.getAccessToken()).toBeNull()
      expect(AuthStorage.getRefreshToken()).toBeNull()
      expect(AuthStorage.getProfile()).toBeNull()
      expect(handler).toHaveBeenCalledWith({ reason: 'logout' })

      off()
    })

    it('clear("expired") 走 expired reason', () => {
      AuthStorage.setAccessToken('a')
      const handler = vi.fn()
      const off = AuthStorage.events.on('auth:cleared', handler)

      AuthStorage.clear('expired')

      expect(handler).toHaveBeenCalledWith({ reason: 'expired' })
      off()
    })
  })

  describe('events', () => {
    it('unsubscribe 之后不再收到', () => {
      const handler = vi.fn()
      const off = AuthStorage.events.on('accessToken:set', handler)
      AuthStorage.setAccessToken('1')
      expect(handler).toHaveBeenCalledOnce()

      off()
      AuthStorage.setAccessToken('2')
      expect(handler).toHaveBeenCalledOnce() // 仍然 1 次
    })
  })
})
