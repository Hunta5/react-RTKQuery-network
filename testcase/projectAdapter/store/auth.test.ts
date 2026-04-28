import { describe, it, expect } from 'vitest'
import authReducer, { setProfile, reset, syncFromStorage } from 'network/projectAdapter/store/auth'
import AuthStorage from 'network/core/storage/authStorage'

describe('authSlice', () => {
  const emptyState = { isAuthenticated: false, profile: null }
  const profileA = { id: '1', name: 'Alice', email: 'a@b.c' }

  describe('setProfile', () => {
    it('登录:设置 profile + isAuthenticated=true', () => {
      const next = authReducer(emptyState, setProfile(profileA))
      expect(next.profile).toEqual(profileA)
      expect(next.isAuthenticated).toBe(true)
    })

    it('更新 profile 覆盖旧 profile', () => {
      const prev = { isAuthenticated: true, profile: profileA }
      const profileB = { id: '2', name: 'Bob', email: 'b@c.d' }
      const next = authReducer(prev, setProfile(profileB))
      expect(next.profile).toEqual(profileB)
      expect(next.isAuthenticated).toBe(true)
    })
  })

  describe('reset', () => {
    it('登出:清 profile + isAuthenticated=false', () => {
      const prev = { isAuthenticated: true, profile: profileA }
      const next = authReducer(prev, reset())
      expect(next.profile).toBeNull()
      expect(next.isAuthenticated).toBe(false)
    })

    it('在已登出状态下调 reset 依然安全(幂等)', () => {
      const next = authReducer(emptyState, reset())
      expect(next).toEqual(emptyState)
    })
  })

  describe('syncFromStorage', () => {
    it('从 AuthStorage 重新快照', () => {
      AuthStorage.loginSuccess({
        accessToken: 'a',
        profile: profileA,
      })

      const next = authReducer(emptyState, syncFromStorage())
      expect(next.profile).toEqual(profileA)
      expect(next.isAuthenticated).toBe(true)
    })

    it('AuthStorage 为空时 sync 出空状态', () => {
      const prev = { isAuthenticated: true, profile: profileA }
      const next = authReducer(prev, syncFromStorage())
      expect(next.profile).toBeNull()
      expect(next.isAuthenticated).toBe(false)
    })
  })
})
