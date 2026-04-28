/**
 * Vitest 全局 setup:
 * - happy-dom 已经给了 window/document/localStorage,不需要手动 polyfill
 * - 每个 test 跑完清 localStorage,避免状态泄漏
 */
import { afterEach, vi } from 'vitest'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})
