# testcase/

network 层的单元测试。

## 首次安装

```bash
npm install -D vitest happy-dom
```

## package.json 加两个 script

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 跑测试

```bash
npm test          # watch 模式,改文件自动重跑
npm run test:run  # 跑一次,CI 用这个
```

## 目录对应

```
testcase/
└── 镜像 src/network/ 的结构,每个模块对应一个 .test.ts 文件
```

## 已覆盖的模块

| 模块 | 测试文件 | 关注点 |
|---|---|---|
| `baseQueryWithUnwrap` | `core/baseQuery/baseQueryWithUnwrap.test.ts` | 信封剥壳 / skipUnwrap / maxRetries 透传 / 错误归一 |
| `baseQueryWithReauth` | `core/baseQuery/baseQueryWithReauth.test.ts` | 401 → refresh → replay / mutex 单飞 / 刷新失败登出 |
| `normalizeError` | `core/transform/normalizeError.test.ts` | 7 种 kind 判别 |
| `ensureErrorMessage` | `core/transform/normalizeFetchError.test.ts` | 各种 status 翻译 / 幂等 |
| `providesList` | `core/tags/providesList.test.ts` | 列表 + LIST tag |
| `AuthStorage` | `core/storage/authStorage.test.ts` | login / logout 事件流 |
| `authSlice` | `projectAdapter/store/auth.test.ts` | 3 个 reducer |

## 没覆盖的(故意)

- `rtkQueryErrorLogger` —— 主要是 console 输出,价值低
- `preferenceStorage` —— 太简单(getter/setter)
- `realtime/connection` —— 需要 WebSocket 服务器,端到端测试更合适
- UI 组件 —— 不在 network 层范围内

## 加新测试

新模块放同名目录,文件后缀 `.test.ts`。例如加 `businessServices/order/`:
```
testcase/businessServices/order/orderApi.test.ts
```
