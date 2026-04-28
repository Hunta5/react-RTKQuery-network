import { EventEmitter } from '../utils/eventEmitter'

export interface UserProfile {
  id: number
  username: string
  fullName: string
  avatar: string
  email: string
  company: string
}


export interface AuthStorageEvents {
  /** access token 被写入 */
  'accessToken:set':      { token: string }
  /** access token 被删除，reason 区分是主动登出 / 401 过期 / 其他 */
  'accessToken:cleared':  { reason: ClearReason }

  /** refresh token 被写入 */
  'refreshToken:set':     { token: string }
  /** refresh token 被删除 */
  'refreshToken:cleared': { reason: ClearReason }

  /** user profile 被写入 */
  'profile:set':          UserProfile
  /** user profile 被删除 */
  'profile:cleared':      { reason: ClearReason }

  /** 完整登出：一次 clear() 触发，订阅方可只监听这一个事件 */
  'auth:cleared':         { reason: ClearReason }

  /** 完整登录：setAccessToken + setProfile 都完成后可主动触发（见下方 loginSuccess 示例）*/
  'auth:login':           { profile: UserProfile }
}

/** 清除 token 的原因，供订阅方区分行为 */
export type ClearReason = 'logout' | 'expired' | 'manual'

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PROFILE: 'user_profile',
} as const

const isBrowser = typeof window !== 'undefined'

class AuthStorage {
  /** 事件中心：外部通过 AuthStorage.events.on(...) 订阅 */
  static events = new EventEmitter<AuthStorageEvents>()

  /* accessToken 설정 / 삭제 */
  static setAccessToken(token?: string, reason: ClearReason = 'manual'): void {
    if (!isBrowser) return
    if (token) {
      localStorage.setItem(KEYS.ACCESS_TOKEN, token)
      this.events.emit('accessToken:set', { token })
    } else {
      localStorage.removeItem(KEYS.ACCESS_TOKEN)
      this.events.emit('accessToken:cleared', { reason })
    }
  }

  /* accessToken 가져옴 */
  static getAccessToken(): string | null {
    if (!isBrowser) return null
    return localStorage.getItem(KEYS.ACCESS_TOKEN)
  }

  /* refreshToken 설정 / 삭제 */
  static setRefreshToken(refreshToken?: string, reason: ClearReason = 'manual'): void {
    if (!isBrowser) return
    if (refreshToken) {
      localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken)
      this.events.emit('refreshToken:set', { token: refreshToken })
    } else {
      localStorage.removeItem(KEYS.REFRESH_TOKEN)
      this.events.emit('refreshToken:cleared', { reason })
    }
  }

  /* refreshToken 가져옴 */
  static getRefreshToken(): string | null {
    if (!isBrowser) return null
    return localStorage.getItem(KEYS.REFRESH_TOKEN)
  }

  /* profile 설정 */
  static setProfile(profile: UserProfile): void {
    if (!isBrowser) return
    localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile))
    this.events.emit('profile:set', profile)
  }

  /* profile 가져옴 */
  static getProfile(): UserProfile | null {
    if (!isBrowser) return null
    const raw = localStorage.getItem(KEYS.USER_PROFILE)
    if (!raw) return null
    try {
      return JSON.parse(raw) as UserProfile
    } catch {
      return null
    }
  }

  /* profile 삭제 */
  static clearProfile(reason: ClearReason = 'manual'): void {
    if (!isBrowser) return
    localStorage.removeItem(KEYS.USER_PROFILE)
    this.events.emit('profile:cleared', { reason })
  }

  /* 인증여부 */
  static isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  /**
   * 一次性清除所有认证数据
   * 先清各项（触发各自的 :cleared 事件），最后再触发聚合事件 'auth:cleared'
   * 订阅方可以按需选择监听粒度
   */
  static clear(reason: ClearReason = 'logout'): void {
    if (!isBrowser) return
    this.setAccessToken(undefined, reason)     // 触发 accessToken:cleared
    this.setRefreshToken(undefined, reason)    // 触发 refreshToken:cleared
    this.clearProfile(reason)                  // 触发 profile:cleared
    this.events.emit('auth:cleared', { reason }) // 聚合事件
  }

  /**
   * 登录成功时一次性写入所有数据
   * 写完后触发 'auth:login'，供埋点 / 初始化 socket 等使用
   */
  static loginSuccess(payload: {
    accessToken: string
    refreshToken?: string
    profile: UserProfile
  }): void {
    if (!isBrowser) return
    this.setAccessToken(payload.accessToken)
    if (payload.refreshToken) this.setRefreshToken(payload.refreshToken)
    this.setProfile(payload.profile)
    this.events.emit('auth:login', { profile: payload.profile })
  }

  /**
   * 用户主动登出:语义化入口,内部走 clear('logout')
   * 订阅 'auth:cleared' 的代码会收到 reason='logout'
   */
  static logout(): void {
    this.clear('logout')
  }
}

export default AuthStorage
