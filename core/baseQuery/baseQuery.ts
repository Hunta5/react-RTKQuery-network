import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { getNetworkConfig } from '../config/env';

let _instance: ReturnType<typeof fetchBaseQuery> | null = null;

function getInstance() {
  if (_instance) return _instance;
  const cfg = getNetworkConfig();
  _instance = fetchBaseQuery({
    baseUrl: cfg.baseUrl,
    timeout: cfg.timeout ?? 15000,
    credentials: 'omit',
    prepareHeaders: (headers) => {
      const c = getNetworkConfig();
      const token = c.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      headers.set('X-Trace-Id', crypto.randomUUID());
      const extra = c.getExtraHeaders?.() ?? {};
      for (const [k, v] of Object.entries(extra)) headers.set(k, v);
      return headers;
    },
  });
  return _instance;
}

export const rawBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = (args, api, extraOptions) => getInstance()(args, api, extraOptions);
