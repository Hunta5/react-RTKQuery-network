// src/services/api/baseApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithUnwrap } from '../baseQuery/baseQueryWithUnwrap'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithUnwrap,

  // 缓存策略
  keepUnusedDataFor: 60,            // 组件卸载后缓存保留 60s
  refetchOnFocus: true,             // 切回 tab 自动刷新
  refetchOnReconnect: true,         // 网络恢复自动刷新
  refetchOnMountOrArgChange: 30,    // 组件挂载时若上次请求超过 30s 则重拉

  // 声明所有业务标签，供 invalidatesTags / providesTags 引用
  tagTypes: [] as string[],

  // 空 endpoints，后续用 injectEndpoints 按模块注入
  endpoints: () => ({}),
});

// 把常用的 util 再导出一次，方便其他文件用
export const {
  util: {
    resetApiState,      // 退出登录时清空所有缓存
    invalidateTags,     // 手动使某些 tag 失效
    prefetch,           // 预取
  },
} = baseApi
