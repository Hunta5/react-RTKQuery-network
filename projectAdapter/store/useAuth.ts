import { useAppSelector } from './hooks'

/** 组件里一行拿到登录态 + profile + loading */
export const useAuth = () => useAppSelector((s) => s.auth)
