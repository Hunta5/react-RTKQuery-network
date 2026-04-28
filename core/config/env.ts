import type { NormalizedError } from '../transform/normalizeError';

export type ReauthConfig = {
  /** 拿到新 access token,失败抛 */
  refreshToken: () => Promise<string>;
  /** 刷新失败 / 无 refresh token,SDK 通知使用方登出 */
  onAuthFailure: () => void;
};

export type NetworkConfig = {
  baseUrl: string;
  timeout?: number;
  /** 默认重试次数,endpoint 可通过 extraOptions.maxRetries 覆盖 */
  maxRetries?: number;
  /** 每次请求 prepareHeaders 时调用,SDK 不知道 token 存哪 */
  getAccessToken: () => string | null | undefined;
  /** 想加 X-Lang / X-Trace-Id 之类的自定义头 */
  getExtraHeaders?: () => Record<string, string>;
  /**
   * 全局错误通知(toast / 维护页跳转等)。SDK 不知道 UI 库,由使用方实现。
   * middleware 只在"应该全局提示"的错误上调用(5xx / 网络 / 超时 / 维护),
   * 业务 4xx / 401 不会调用(前者交给组件,后者 reauth 层处理)。
   */
  onGlobalError?: (error: NormalizedError) => void;
  reauth: ReauthConfig;
};

let _config: NetworkConfig | null = null;

export function configureNetwork(config: NetworkConfig) {
  _config = config;
}

export function getNetworkConfig(): NetworkConfig {
  if (!_config) {
    throw new Error('Network SDK not configured. Call configureNetwork() at app boot.');
  }
  return _config;
}
