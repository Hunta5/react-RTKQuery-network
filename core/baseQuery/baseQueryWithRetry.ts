import { retry } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export const baseQueryWithRetry = retry(
  async (args, api, extraOptions) => {
    const result = await baseQueryWithReauth(args, api, extraOptions);
    const status = result.error?.status;
    // 4xx 业务错误直接 fail，不再重试
    if (typeof status === 'number' && status >= 400 && status < 500) {
      retry.fail(result.error);
    }
    return result;
  },
  { maxRetries: 3 },//default retry 3 times
);
