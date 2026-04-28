import AuthStorage from 'network/core/storage/authStorage';
import type { ReauthConfig } from 'network/core/config/env';

export const REAUTH_CONFIG: ReauthConfig = {
  refreshToken: async () => {
    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/landing-page/auth/update-session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );
    if (!res.ok) throw new Error('REFRESH_FAILED');

    const data = await res.json();
    AuthStorage.setAccessToken(data.access_token);
    if (data.refresh_token) AuthStorage.setRefreshToken(data.refresh_token);
    return data.access_token;
  },

  onAuthFailure: () => {
    AuthStorage.clear('expired');
    // Redux reset + RTK 缓存清理由 subscribers 监听 'auth:cleared' 事件统一处理
  },
};
