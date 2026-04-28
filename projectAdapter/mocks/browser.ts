/**
 * MSW 浏览器端 worker 注册。
 *
 * 首次使用先跑:
 *   npx msw init public/ --save
 *
 * 然后在 initialize.ts / NetworkProvider 里:
 *   if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true') {
 *     const { worker } = await import('network/projectAdapter/mocks/browser')
 *     await worker.start({ onUnhandledRequest: 'bypass' })
 *   }
 */
// @ts-ignore  safe: npm install -D msw
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
