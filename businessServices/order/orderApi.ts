import { baseApi } from 'network/core/api/baseApi'
import { providesList } from 'network/core/tags/providesList'
import { ORDER_TAG_TYPES, OrderListTag, orderTag } from './order.tags'

const orderApiWithTags = baseApi.enhanceEndpoints({
  addTagTypes: ORDER_TAG_TYPES,
})

export interface Post {
  name: string
  id: string
}

export const orderApi = orderApiWithTags.injectEndpoints({
  endpoints: (build) => ({
    listPosts: build.query<Post[], void>({
      query: () => '/posts',
      providesTags: providesList('Order'),
    }),
    getPost: build.query<Post, string>({
      query: (id) => `/posts/${id}`,
      providesTags: (_r, _e, id) => [orderTag(id)],
    }),
    createPost: build.mutation<Post, Pick<Post, 'name'>>({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      invalidatesTags: [OrderListTag],
    }),
    deletePost: build.mutation<void, string>({
      query: (id) => ({ url: `/posts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [orderTag(id), OrderListTag],
    }),
  }),
})

export const {
  useListPostsQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useDeletePostMutation,
} = orderApi
