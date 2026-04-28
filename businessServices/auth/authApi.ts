import { baseApi, invalidateTags } from 'network/core/api/baseApi'
import type { UserProfile } from 'network/core/storage/authStorage'
import { AUTH_TAG_TYPES, AuthTag, MeTag } from './auth.tags'
import type { LoginDto, LoginResponseDto } from './auth.dto'
import { RegisterRequestType, RegisterResponseType } from './register.dto'




const authApiWithTags = baseApi.enhanceEndpoints({
  addTagTypes: AUTH_TAG_TYPES,
})

export const authApi = authApiWithTags.injectEndpoints({
  endpoints: (build) => ({
    // 登陆
    login: build.mutation<LoginResponseDto, LoginDto>({
      query: (body) => ({
        url: '/landing-page/auth/login',
        method: 'POST',
        body,
      }),
      // 后端实际返回 { data: { access_token, refresh_token } }(无 code 字段),
      // baseQueryWithUnwrap 只剥 {code,data,message} 信封,这里手动剥外层 data。
      transformResponse: (resp: { data: LoginResponseDto }) => resp.data,
      // 换了身份,让会话相关缓存(当前用户、会话状态)全部重拉
      invalidatesTags: [AuthTag, MeTag],
    }),

    getUserProfile: build.query<UserProfile, void>({
      query: () => ({
        url: '/landing-page/auth/profile',
        method: 'GET',
      }),
      // 假设后端 profile 接口也是 { data: {...} } 同款外壳,同样剥一层。
      // 如果实际不带 data 包装,把这一行删掉。
      transformResponse: (resp: { data: UserProfile }) => resp.data,
      providesTags: [MeTag],
    }),

    register: build.mutation<RegisterResponseType, RegisterRequestType>({
      query: (body) => ({
        url: '/landing-page/auth/register',
        method: 'POST',
        body,
      }),
      transformResponse: (resp: { data: RegisterResponseType }) => resp.data,
    }),

  }),



})

export const {
  useLoginMutation,
  useGetUserProfileQuery,
  useLazyGetUserProfileQuery,   // ← 加这行
} = authApi
