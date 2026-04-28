import { Mutex } from 'async-mutex';
import type {
  BaseQueryFn, FetchArgs, FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { rawBaseQuery } from './baseQuery';
import { getNetworkConfig } from '../config/env';

const mutex = new Mutex();

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs, unknown, FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) return result;

  const { reauth } = getNetworkConfig();
  const release = await mutex.acquire();

  try {
    result = await rawBaseQuery(args, api, extraOptions);
    if (result.error?.status !== 401) return result;

    await reauth.refreshToken();
    result = await rawBaseQuery(args, api, extraOptions);
  } catch {
    reauth.onAuthFailure();
  } finally {
    release();
  }

  return result;
};
