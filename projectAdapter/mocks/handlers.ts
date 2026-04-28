/**
 * MSW 请求 mock handlers。前提:已 npm install -D msw。
 *
 * 开发期在后端接口未 ready 时给假数据。所有 handler 用项目统一信封格式
 * { code, data, message },走你现有的 unwrap 逻辑。
 *
 * 用法见 ./browser.ts
 */
// @ts-ignore  safe: npm install -D msw
import { http, HttpResponse } from 'msw'

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

export const handlers = [
  // 示例:订单列表
  http.get(`${API}/posts`, () => {
    return HttpResponse.json({
      code: 0,
      data: [
        { id: '1', name: 'Post one' },
        { id: '2', name: 'Post two' },
      ],
      message: 'ok',
    })
  }),

  // 示例:业务错误
  http.get(`${API}/posts/:id`, ({ params }: { params: { id: string } }) => {
    if (params.id === 'bad') {
      return HttpResponse.json({
        code: 1001,
        data: null,
        message: 'Post not found',
      })
    }
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, name: `Post ${params.id}` },
      message: 'ok',
    })
  }),
]
