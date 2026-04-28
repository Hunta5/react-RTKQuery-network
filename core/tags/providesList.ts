/**
 * 列表查询的 providesTags helper:同时给每个 item 和 LIST 打 tag,
 * 这样无论 invalidatesTags 是按 id 还是按 LIST 失效,都会触发列表重拉。
 *
 *   providesTags: providesList('order'),
 *
 * 等价于手写:
 *   providesTags: (result) =>
 *     result
 *       ? [...result.map(({ id }) => ({ type: 'order', id })), { type: 'order', id: 'LIST' }]
 *       : [{ type: 'order', id: 'LIST' }]
 */
export const providesList =
  <T extends string>(type: T) =>
  <Item extends { id: string | number }>(result: Item[] | undefined) =>
    result
      ? [
          ...result.map(({ id }) => ({ type, id }) as const),
          { type, id: 'LIST' } as const,
        ]
      : [{ type, id: 'LIST' } as const]
