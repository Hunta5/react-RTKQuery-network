import { message } from 'antd'
import { configureNetwork } from 'network/core/config/env'
import AuthStorage from 'network/core/storage/authStorage'
import PreferenceStorage from 'network/core/storage/preferenceStorage'
import { registerAuthSubscribers } from 'network/projectAdapter/store/subscribers'
import { REAUTH_CONFIG } from 'network/projectAdapter/auth/reauth'
export { store } from 'network/projectAdapter/store/store'

let initialized = false

// 分环境常量;baseUrl 仍然优先取 env 变量,这里只是兜底 + 文档作用
const ENV_DEFAULT_BASE_URL: Record<string, string> = {
  development: 'https://admin-api.testforte-dev.com/api',
  staging:     'https://admin-api.testforte-dev.com/api',
  production:  'https://api-admin.testforte.com/api',
}

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL
  const env = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development'
  const fallback = ENV_DEFAULT_BASE_URL[env]
  if (!fallback) {
    throw new Error(`[network] 未配置 NEXT_PUBLIC_API_BASE_URL,且 env=${env} 无默认值`)
  }
  return fallback
}

export function initializeNetwork() {
  if (initialized) return
  initialized = true

  // @ts-ignore
  // @ts-ignore
  configureNetwork({
    baseUrl: resolveBaseUrl(),
    timeout: 15000,
    maxRetries: 2,
    getAccessToken: () => AuthStorage.getAccessToken(),
    getExtraHeaders: () => ({
      'X-Lang': PreferenceStorage.getLang(),
      // 如需 API 版本:'Accept': 'application/vnd.company.v1+json',
    }),

    onGlobalError: (err): void => {
      if (err.kind === 'maintenance') {
        void message.warning('System is under maintenance. Please try again later.')
        return
      }
      void message.error(err.message)
    },
    reauth: REAUTH_CONFIG,
  })

  registerAuthSubscribers()
}
