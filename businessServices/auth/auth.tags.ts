/**
 * auth 模块的 tag 常量
 * - AUTH_TAG_TYPES:供 enhanceEndpoints({ addTagTypes }) 使用
 * - MeTag:当前登陆用户信息(getMe / profile 等 query 用 providesTags: [MeTag])
 *   登陆/登出时 invalidate 它,触发用户身份相关缓存重拉
 */
export const AUTH_TAG_TYPES = ['Auth', 'Me'] as const
export type AuthTagType = typeof AUTH_TAG_TYPES[number]

export const AuthTag = { type: 'Auth' as const, id: 'SESSION' as const }
export const MeTag = { type: 'Me' as const, id: 'CURRENT' as const }
