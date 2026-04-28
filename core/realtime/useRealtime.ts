import { useEffect } from 'react'
import type { RealtimeConnection } from './connection'

/**
 * 订阅 WebSocket 消息的 React hook。
 *
 *   useRealtime(connection, (msg) => {
 *     if (msg.type === 'order_updated') {
 *       dispatch(api.util.invalidateTags([{ type: 'Order', id: msg.orderId }]))
 *     }
 *   })
 */
export function useRealtime(
  connection: RealtimeConnection | null,
  handler: (message: unknown) => void,
) {
  useEffect(() => {
    if (!connection) return
    return connection.subscribe(handler)
  }, [connection, handler])
}
