import type {
  BaseQueryFn, FetchArgs, FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { baseQueryWithRetry } from './baseQueryWithRetry';
import { getNetworkConfig } from '../config/env';
import type { ApiResponse } from '../transform/transform';
import { ensureErrorMessage } from '../transform/normalizeFetchError';

type RetryExtraOptions = NonNullable<Parameters<typeof baseQueryWithRetry>[2]>;

export type UnwrapExtraOptions = RetryExtraOptions & {
  /** true 时跳过信封剥壳,直接返回原始响应(下载、第三方代理等场景) */
  skipUnwrap?: boolean;
};

export const baseQueryWithUnwrap: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  UnwrapExtraOptions
> = async (args, api, extraOptions) => {
  const cfg = getNetworkConfig();
  const mergedExtra = {
    ...(cfg.maxRetries !== undefined && { maxRetries: cfg.maxRetries }),
    ...extraOptions,
  } as UnwrapExtraOptions;

  const result = await baseQueryWithRetry(args, api, mergedExtra);
  if (result.error) {
    return { error: ensureErrorMessage(result.error) };
  }
  if (extraOptions?.skipUnwrap) return result;

  const resp = result.data as ApiResponse<unknown> | undefined;
  if (resp && typeof resp === 'object' && 'code' in resp) {
    if (resp.code !== 0) {
      return {
        error: {
          status: resp.code,
          data: resp,
          message: resp.message ?? 'request failed',
        } as unknown as FetchBaseQueryError,
      };
    }
    return { data: resp.data };
  }

  return result;
};
