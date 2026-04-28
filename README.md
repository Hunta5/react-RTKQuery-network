# network/

JSON API 层。**不负责**文件上传/下载、WebSocket 业务协议、第三方云 SDK。

## 目录

- [快速上手](#快速上手)
- [写一个新接口](#写一个新接口)
- [在组件里用接口](#在组件里用接口)
- [登录 / 登出 / useAuth](#登录--登出--useauth)
- [DTO 文件约定](#dto-文件约定)
- [缓存 & Tag](#缓存--tag)
- [错误处理](#错误处理)
- [请求取消](#请求取消)
- [文件下载](#文件下载)
- [API 版本](#api-版本)
- [Mock / MSW](#mock--msw开发期)
- [WebSocket](#websocket可选)
- [测试](#测试)
- [环境变量](#环境变量)
- [常见问题 / FAQ](#常见问题--faq)
- [调试技巧](#调试技巧)
- [架构总览](#架构总览)

---

## 快速上手

刚进项目?5 分钟看完这一节就能写业务。

### 依赖安装

`network/` 运行需要以下依赖。如果是从零接入到一个新项目,先装好这些:

**运行时依赖(必装)**:

```bash
npm install @reduxjs/toolkit react-redux async-mutex
```

- `@reduxjs/toolkit` —— RTK Query + createSlice,`baseApi` / `authSlice` 的基础
- `react-redux` —— `<Provider>` + `useSelector` / `useDispatch`,`NetworkProvider` 和 `useAuth` 依赖
- `async-mutex` —— 401 刷新 token 的单飞锁(`baseQueryWithReauth`)

**宿主环境依赖(项目里一般已经有)**:

```bash
npm install react react-dom next
```

**开发 / 测试依赖(跑测试才需要)**:

```bash
npm install -D vitest happy-dom
```

**可选依赖**:

```bash
npm install -D msw                # Mock(见下文 Mock / MSW 章节)
# 文件下载想用 saveAs 时:
npm install file-saver
npm install -D @types/file-saver
```

> TypeScript 需要 `"moduleResolution": "node"` 或 `"bundler"`,`paths` 里配好 `"network/*": ["src/network/*"]`(见项目 `tsconfig.json`)。

### 我要做的事 → 看哪里

| 我要... | 改这里 |
|---|---|
| 加一个新业务模块的接口 | `businessServices/<模块>/` 新建 3 个文件 |
| 调一下后端的 baseUrl | `.env.development` / `.env.production` |
| 改登录态怎么显示 | `projectAdapter/store/useAuth.ts` |
| 改登出按钮逻辑 | 调 `AuthStorage.logout()` |
| 改全局错误 toast 文案 / UI 库 | `projectAdapter/initialize.ts` 的 `onGlobalError` |
| 改 token 刷新接口 | `projectAdapter/auth/reauth.ts` |
| 加自定义请求头 | `projectAdapter/initialize.ts` 的 `getExtraHeaders` |

`core/` 永远不要碰 —— 它是 SDK 边界。

### 启动开发

```bash
npm install
npm run dev          # 默认环境
npm run dev:local    # 用 .env.local-be
npm run dev:stg      # 用 .env.staging
npm test             # 跑测试
```

---

## 写一个新接口

3 个文件搞定一个业务模块。以 Order 为例:

### 1️⃣ `order.dto.ts` —— 类型

```ts
// businessServices/order/order.dto.ts

export interface OrderDto {
  id: string
  order_no: string
  amount: number
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  created_at: string
}

export interface CreateOrderDto {
  product_id: string
  quantity: number
}

export interface ListOrderQuery {
  page: number
  size: number
  status?: OrderDto['status']
}
```

### 2️⃣ `order.tags.ts` —— Tag 常量

```ts
// businessServices/order/order.tags.ts

export const ORDER_TAG_TYPES = ['Order'] as const
export type OrderTagType = typeof ORDER_TAG_TYPES[number]

export const OrderListTag = { type: 'Order' as const, id: 'LIST' as const }
export const orderTag = (id: string | number) => ({ type: 'Order' as const, id })
```

### 3️⃣ `orderApi.ts` —— Endpoint 定义

```ts
// businessServices/order/orderApi.ts
import { baseApi } from 'network/core/api/baseApi'
import { providesList } from 'network/core/tags/providesList'
import { ORDER_TAG_TYPES, OrderListTag, orderTag } from './order.tags'
import type { OrderDto, CreateOrderDto, ListOrderQuery } from './order.dto'

const orderApiWithTags = baseApi.enhanceEndpoints({
  addTagTypes: ORDER_TAG_TYPES,
})

export const orderApi = orderApiWithTags.injectEndpoints({
  endpoints: (build) => ({
    // GET 列表
    listOrders: build.query<OrderDto[], ListOrderQuery>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: providesList('Order'),
    }),

    // GET 详情
    getOrder: build.query<OrderDto, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_r, _e, id) => [orderTag(id)],
    }),

    // POST 创建
    createOrder: build.mutation<OrderDto, CreateOrderDto>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      invalidatesTags: [OrderListTag],
    }),

    // PATCH 更新
    updateOrder: build.mutation<OrderDto, { id: string; patch: Partial<OrderDto> }>({
      query: ({ id, patch }) => ({ url: `/orders/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_r, _e, { id }) => [orderTag(id), OrderListTag],
    }),

    // DELETE 删除
    deleteOrder: build.mutation<void, string>({
      query: (id) => ({ url: `/orders/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [orderTag(id), OrderListTag],
    }),
  }),
})

export const {
  useListOrdersQuery,
  useGetOrderQuery,
  useLazyGetOrderQuery,            // 懒查询(手动触发)
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useDeleteOrderMutation,
} = orderApi
```

不用改 `store.ts` —— `injectEndpoints` 自动挂到 baseApi。

---

## 在组件里用接口

### Query(读数据)

```tsx
import { useGetOrderQuery } from 'network/businessServices/order/orderApi'

function OrderDetail({ id }: { id: string }) {
  const { data, error, isLoading, refetch } = useGetOrderQuery(id)

  if (isLoading) return <Spin />
  if (error) return <div>{(error as any).message}</div>
  if (!data) return null

  return (
    <div>
      <h1>{data.order_no}</h1>
      <p>金额:{data.amount}</p>
      <button onClick={refetch}>刷新</button>
    </div>
  )
}
```

### Query 带参数

```tsx
const { data } = useListOrdersQuery({ page: 1, size: 20, status: 'PAID' })
```

### Lazy Query(手动触发)

```tsx
const [trigger, { data, isFetching }] = useLazyGetOrderQuery()

<button onClick={() => trigger('order-123')}>加载订单</button>
```

### Mutation(写数据)

```tsx
import { useCreateOrderMutation } from 'network/businessServices/order/orderApi'

function CreateOrderForm() {
  const [createOrder, { isLoading }] = useCreateOrderMutation()

  const onSubmit = async (values: CreateOrderDto) => {
    try {
      const order = await createOrder(values).unwrap()  // .unwrap() 拿到非 undefined 的值
      message.success(`订单 ${order.order_no} 创建成功`)
      router.push(`/orders/${order.id}`)
    } catch (err: any) {
      // 业务错误已经被 normalizeError 处理过 message
      message.error(err.message ?? '创建失败')
    }
  }

  return <Form onFinish={onSubmit} disabled={isLoading}>...</Form>
}
```

### 跳过缓存(总是重拉)

```tsx
const { data } = useGetOrderQuery(id, { refetchOnMountOrArgChange: true })
```

### 条件查询(skip)

```tsx
const { data } = useGetOrderQuery(id, { skip: !id })   // id 为空时不发请求
```

### 轮询

```tsx
const { data } = useGetOrderQuery(id, { pollingInterval: 5000 })  // 每 5s 重拉
```

---

## 登录 / 登出 / useAuth

### 登录(任何登录方式都走这套)

```tsx
import AuthStorage from 'network/core/storage/authStorage'

const handleLogin = async () => {
  // 1. 调登录接口(通常是个 RTK Query mutation)
  const { accessToken, refreshToken, profile } = await loginApi(credentials).unwrap()

  // 2. 写入 AuthStorage(自动触发 'auth:login' 事件)
  AuthStorage.loginSuccess({ accessToken, refreshToken, profile })

  // 3. 完成,不用管 Redux —— subscribers 会自动 dispatch(setProfile)
  router.push('/dashboard')
}
```

### 登出

```tsx
import AuthStorage from 'network/core/storage/authStorage'

const handleLogout = () => {
  AuthStorage.logout()
  // 自动:① 清 token + profile ② dispatch(reset()) ③ 清 RTK Query 缓存
  router.push('/login')
}
```

### 检查登录态

**在组件里(响应式,登录/登出自动重渲染)**:
```tsx
import { useAuth } from 'network/projectAdapter/store/useAuth'

function Header() {
  const { isAuthenticated, profile } = useAuth()

  return isAuthenticated
    ? <span>Hi, {profile?.name}</span>
    : <Link to="/login">登录</Link>
}
```

**在非组件代码里(同步快照,如路由守卫)**:
```ts
import AuthStorage from 'network/core/storage/authStorage'

if (!AuthStorage.isAuthenticated()) {
  router.push('/login')
}
```

### 401 自动登出

不用写代码。`baseQueryWithReauth` 接管:
- 任何请求 401 → mutex 单飞调刷新接口
- 刷新成功 → 用新 token 重放原请求,组件无感
- 刷新失败 → 自动调 `AuthStorage.clear('expired')` → 触发登出

如果你想在 401 自动登出后做点别的(比如跳登录页),订阅 `auth:cleared` 事件:

```ts
// 在 NetworkProvider.tsx 或某个 useEffect 里
import AuthStorage from 'network/core/storage/authStorage'

AuthStorage.events.on('auth:cleared', ({ reason }) => {
  if (reason === 'expired') {
    message.warning('登录已过期,请重新登录')
    router.push('/login')
  }
})
```

---

## DTO 文件约定

每个业务模块独立 `.dto.ts`,按需要分:

```
businessServices/order/
├── order.dto.ts       # OrderDto, CreateOrderDto, ListOrderQuery 等
├── order.tags.ts      # ORDER_TAG_TYPES, OrderListTag, orderTag()
├── orderApi.ts        # endpoints
└── (可选) order.mapper.ts  # 后端 snake_case → 前端 camelCase 转换
```

**字段名约定**:跟后端保持一致(本项目后端用 snake_case,DTO 也用 snake_case)。**不要在 DTO 里假装改成 camelCase** —— 字段读不到 / 类型骗自己。

如果一定要 camelCase,加 mapper 层,在 `transformResponse` 里转:
```ts
listOrders: build.query<OrderVM[], void>({
  query: () => '/orders',
  transformResponse: (resp: OrderDto[]) => resp.map(toOrderVM),
}),
```

---

## 缓存 & Tag

### 写 providesTags / invalidatesTags

记忆口诀:**Query 给(provides),Mutation 让别人失效(invalidates)**。

| 操作 | invalidate 哪些 |
|---|---|
| 创建 | `[OrderListTag]`(列表要重拉) |
| 更新 | `[orderTag(id), OrderListTag]`(详情 + 列表) |
| 删除 | `[orderTag(id), OrderListTag]`(同上) |
| 跨实体写 | `[orderTag(orderId), userTag(userId), OrderListTag]` |

### Helper

```ts
providesTags: providesList('Order')        // 列表 query 用
providesTags: (_r, _e, id) => [orderTag(id)]  // 详情 query 用
invalidatesTags: [OrderListTag]            // mutation 让列表失效
```

### Prefetch(预取)

```tsx
import { store } from 'network/projectAdapter/store/store'
import { orderApi } from 'network/businessServices/order/orderApi'

// 鼠标悬停时预取详情
<Card onMouseEnter={() => {
  store.dispatch(orderApi.util.prefetch('getOrder', id, { force: false }))
}} />
```

### 手动让缓存失效

```tsx
import { useAppDispatch } from 'network/projectAdapter/store/hooks'
import { baseApi } from 'network/core/api/baseApi'

const dispatch = useAppDispatch()
dispatch(baseApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]))
```

### 登出清缓存(自动)

`AuthStorage.logout()` / 401 过期时 `subscribers.ts` 自动 dispatch `baseApi.util.resetApiState()`,清所有缓存,**避免账号串**。组件不用手动处理。

---

## 错误处理

### 组件局部 —— 用 `normalizeError` 判别 kind

```tsx
import { normalizeError } from 'network/core/transform/normalizeError'

const { data, error } = useGetOrderQuery(id)

if (error) {
  const err = normalizeError(error)
  switch (err.kind) {
    case 'business':    return <FormError code={err.code} message={err.message} />
    case 'network':     return <OfflineBanner />
    case 'timeout':     return <Retry onClick={refetch} />
    case 'maintenance': return <MaintenancePage />
    case 'http':        return <div>HTTP {err.status}: {err.message}</div>
    default:            return <div>{err.message}</div>
  }
}
```

### 简化版 —— 直接拿 message

```tsx
if (error) return <div>{(error as any).message}</div>
```

`error.message` 已经被 `ensureErrorMessage` 翻译成人话(超时 / 断网 / 5xx 等都映射好了)。

### 全局 —— `onGlobalError`(已配)

`5xx / network / timeout / maintenance / parse` 这几类自动弹 toast,不用组件写。**业务错误(`business`)和 401 不会全局弹**(组件 / reauth 各自处理)。

要换 UI 库或加埋点,改 `projectAdapter/initialize.ts` 的 `onGlobalError`。

### 错误分类速查

| kind | 触发 | 默认 toast |
|---|---|---|
| `business` | 信封 code !== 0(且 ≥ 1000) | ❌ |
| `http 4xx` | HTTP 400-499 | ❌ |
| `http 5xx` | HTTP 500+ | ✅ |
| `maintenance` | HTTP 503 | ✅(特殊文案) |
| `network` | 断网 / CORS | ✅ |
| `timeout` | 超时 | ✅ |
| `parse` | 响应非 JSON | ✅ |
| `unknown` | 其他 | ❌ |

---

## 请求取消

### 组件 unmount 自动取消

RTK Query 默认行为,不用写代码。

### 手动取消(搜索防抖)

```tsx
const [trigger] = useLazySearchQuery()

useEffect(() => {
  const result = trigger(keyword)
  return () => result.abort()   // keyword 变化时取消上次
}, [keyword])
```

### Mutation 取消

```tsx
const [createOrder] = useCreateOrderMutation()

const promise = createOrder(values)
// 用户按取消按钮:
promise.abort()
// 然后:
await promise   // 会抛 AbortError,记得 try/catch
```

---

## 文件下载

不是 RTK Query 的强项,但简单下载可以:

```ts
downloadFile: build.query<Blob, string>({
  query: (id) => ({
    url: `/files/${id}`,
    responseHandler: 'blob',
  }),
  extraOptions: { skipUnwrap: true, maxRetries: 0 },
}),
```

```tsx
const { data: blob } = useDownloadFileQuery(id)
useEffect(() => {
  if (blob) saveAs(blob, 'filename.pdf')   // 用 file-saver 或自己创建 a 标签
}, [blob])
```

**带进度的上传/大文件下载**:不要走 RTK Query。用对象存储 SDK(OSS/S3/COS)或独立 `src/upload/` 模块写 XHR。

---

## API 版本

全局加版本 header:
```ts
// projectAdapter/initialize.ts
getExtraHeaders: () => ({
  'X-Lang': PreferenceStorage.getLang(),
  'Accept': 'application/vnd.company.v2+json',
}),
```

某个 endpoint 单独换版本:
```ts
getOrderV2: build.query<Order, string>({
  query: (id) => ({
    url: `/orders/${id}`,
    headers: { 'Accept': 'application/vnd.company.v2+json' },
  }),
}),
```

---

## Mock / MSW(开发期)

后端没好,前端先写。

```bash
npm install -D msw
npx msw init public/ --save
```

`projectAdapter/mocks/handlers.ts` 写假数据。`.env.local` 加 `NEXT_PUBLIC_ENABLE_MOCK=true` 开启。

详见 `projectAdapter/mocks/browser.ts` 顶部注释。

---

## WebSocket(可选)

`core/realtime/connection.ts` 是骨架,业务自己包一层。典型流程:

```ts
// projectAdapter/realtime/notificationChannel.ts
import { RealtimeConnection } from 'network/core/realtime/connection'
import AuthStorage from 'network/core/storage/authStorage'
import { store } from 'network/projectAdapter/store/store'
import { orderApi } from 'network/businessServices/order/orderApi'

export const notificationChannel = new RealtimeConnection({
  url: 'wss://api.example.com/ws',
  getAuthToken: () => AuthStorage.getAccessToken(),
})

notificationChannel.subscribe((msg: any) => {
  if (msg?.type === 'order_updated') {
    store.dispatch(orderApi.util.invalidateTags([{ type: 'Order', id: msg.orderId }]))
  }
})
```

应用启动时 `notificationChannel.connect()`,登出时 `close()`。

---

## 测试

```bash
npm install -D vitest happy-dom
npm test
```

测试在 `network/testcase/`,目录结构镜像源码。已覆盖核心:reauth / unwrap / normalize / tag / AuthStorage / authSlice。

加新测试:`testcase/<对应路径>/<文件>.test.ts`,详见 `testcase/README.md`。

---

## 环境变量

| 变量 | 说明 | 必需 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | API 根路径 | ⚠️ 没设会抛错 |
| `NEXT_PUBLIC_APP_ENV` | `development` / `staging` / `production`,影响 baseUrl 兜底 | 可选 |
| `NEXT_PUBLIC_ENABLE_MOCK` | `'true'` 时开启 MSW | 可选,仅 dev 生效 |
| `NODE_ENV` | Next.js 自动设 | 自动 |

`.env.local` 不会被 git 跟踪,放本地秘钥/开关。

---

## 常见问题 / FAQ

### Q: `data` 为什么总是 `T | undefined`?

A: RTK Query 标准行为。loading 中 / 失败时 `data` 为 undefined。组件用可选链 `data?.xxx` 即可。

### Q: 后端响应字段是 `access_token`,我能用 `accessToken` 吗?

A: 可以,但要在 `transformResponse` 或 `mapper` 里显式转。直接写 `accessToken` 类型 TS 不会报错,但**运行时拿到 undefined**(后端给的是 snake_case)。建议 DTO 跟后端保持一致。

### Q: 业务错误(code !== 0)为什么不弹 toast?

A: 因为业务错误通常组件要"原地处理"(表单校验、按钮变灰、字段提示),全局 toast 反而打扰。如果某个业务错误确实想全局弹,在组件里 `message.error(err.message)`。

### Q: 登录成功后页面没刷新?

A: 检查 `AuthStorage.loginSuccess()` 有没有调。它会触发 `auth:login` 事件,subscribers 自动 dispatch `setProfile`,Redux 一变组件就重渲染。

### Q: useGetXxxQuery 重复触发?

A: 看 hook 的参数引用是否稳定。每次组件渲染传新对象 `{page: 1}` 字面量,RTK 视为新 args 会重拉。用 `useMemo` 稳住引用,或拆成 primitive 参数。

### Q: 我有 5 个组件都 `useGetOrderQuery('123')`,会发 5 次请求吗?

A: 不会。RTK Query 自动去重,5 个组件**共享 1 次请求 + 1 份缓存**。

### Q: `.unwrap()` 是干啥的?

A: Mutation 的返回是 `{data, error, ...}` 形态。`.unwrap()` 把它转成"成功 → 直接返 data,失败 → 抛错"的常规 promise,适合 try/catch 写法。

### Q: SSR 时 `useAuth().isAuthenticated` 总是 `false`?

A: 服务端没有 localStorage,AuthStorage 永远返回 false。客户端 hydrate 时再读到真值,会有短暂闪烁或 hydration warning。**应对**:auth 相关 UI 用 `useEffect` 延迟到客户端渲染。

### Q: 我新加了 reducer,要改 store.ts 吗?

A: 业务 reducer **不要**塞进 `projectAdapter/store/store.ts` 的 reducer map —— 那是 auth + RTK Query 专用。业务状态用 RTK Query(对于服务端数据)或独立 slice 文件,需要的话再注册。

---

## 调试技巧

### 1. RTK Query DevTools(看缓存 / tag / endpoint 状态)

装 Redux DevTools 浏览器扩展,F12 → Redux 面板 → 看 `api.queries` / `api.mutations` 状态。

### 2. 看请求日志

dev 模式下 `rtkQueryErrorLogger` 自动在 console 输出请求/响应/耗时(成功绿色,失败红色)。生产模式自动关闭。

不想看某个高频接口?编辑 `core/middleware/rtkQueryErrorLogger.ts` 的 `IGNORE_ENDPOINTS` 加白名单。

### 3. 看真实发出去的请求

F12 Network 面板。请求头里能看到:
- `Authorization: Bearer xxx` ← 当前 token
- `X-Trace-Id` ← 每次唯一,跟后端日志对得上
- `X-Lang` ← 当前语言

### 4. 模拟错误

不想真打后端测错误处理?用 MSW(见上)在 handler 里返回 503 / 1001 / delay 30s 触发超时。

### 5. token 状态

直接看 localStorage:
```js
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')
localStorage.getItem('user_profile')
```

或控制台:`AuthStorage.isAuthenticated()`(如果你 import 了它)。

---

## 架构总览

### 目录结构

```
network/
├── core/                 SDK,0 业务依赖,理论上可发包
│   ├── api/baseApi       RTK Query 实例
│   ├── baseQuery/        4 层包装:rawBaseQuery → reauth → retry → unwrap
│   ├── config/env.ts     NetworkConfig 契约 + configureNetwork 注入点
│   ├── middleware/       RTK middleware(日志 + 全局错误分发)
│   ├── storage/          AuthStorage + PreferenceStorage(localStorage)
│   ├── tags/             providesTags helper
│   ├── transform/        ApiResponse<T> 类型 + error 归一化
│   ├── realtime/         WebSocket 连接管理(可选)
│   └── utils/            EventEmitter 等
│
├── projectAdapter/       项目接入层,换项目整个替换
│   ├── initialize.ts     configureNetwork({...}) 一次性注入
│   ├── NetworkProvider   包装 ReduxProvider + 自动 init
│   ├── auth/reauth.ts    实现 ReauthConfig 契约
│   ├── store/            项目特定的 Redux 配置
│   └── mocks/            MSW handlers(可选)
│
├── businessServices/     业务接口定义(常增量)
│   └── order/
│
└── testcase/             单元测试(vitest)
```

### 请求流水线

```
fetch
  └─→ rawBaseQuery              header 注入(token / X-Lang / X-Trace-Id)
       └─→ baseQueryWithReauth  401 → mutex 单飞刷新 → 重放
            └─→ baseQueryWithRetry  5xx 重试,4xx fail-fast
                 └─→ baseQueryWithUnwrap  { code, data, message } 剥壳
                      └─→ baseApi  RTK Query
```

每层 `extraOptions` 透传:
- `skipUnwrap: true` → 跳过剥壳(下载、第三方代理)
- `maxRetries: N` → 覆盖该请求的重试次数

### 接入新项目 checklist

只改 `projectAdapter/`,`core/` 不动:

- [ ] `initialize.ts` — baseUrl 来源、自定义 headers、onGlobalError 弹 toast
- [ ] `auth/reauth.ts` — 刷新接口 URL + 响应字段名
- [ ] `store/auth.ts` — profile 字段形状
- [ ] `store/store.ts` — 注册新业务 reducer

完成后 `businessServices/` 按模块增量加 endpoint。

### 不要往 `core/` 放

- ❌ 直接 import `AuthStorage` 的文件(例外:`baseQueryWithReauth`)
- ❌ 直接 import Redux store 的文件
- ❌ antd / ElementPlus / 任何 UI 库
- ❌ 业务 endpoint 定义
- ❌ 跟当前后端 API 路径强绑定的代码

### 不做的事

`network/` **不处理**:
- 文件上传 / 下载(用对象存储 SDK 或独立模块)
- 二进制数据流
- 与 RTK Query 不兼容的请求(JSONP / Stream)
