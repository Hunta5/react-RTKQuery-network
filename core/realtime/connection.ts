/**
 * WebSocket 管理器骨架。
 * 职责:连接、重连、心跳、消息订阅。不处理业务协议。
 * 使用方:在 projectAdapter 里包一层业务协议解析,调 subscribe()。
 *
 * 这是个起步模板,按实际需求扩展(鉴权 ticket、分频道、二进制消息等)。
 */

type MessageHandler = (message: unknown) => void
type Unsubscribe = () => void

export interface RealtimeOptions {
  url: string
  /** 重连间隔 ms,默认 3000 */
  reconnectInterval?: number
  /** 心跳间隔 ms,0 表示不发,默认 30000 */
  heartbeatInterval?: number
  /** 心跳消息内容 */
  heartbeatPayload?: unknown
  /** 连接打开时附带的鉴权 token(如需要) */
  getAuthToken?: () => string | null | undefined
}

export class RealtimeConnection {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private closedByUser = false

  constructor(private opts: RealtimeOptions) {}

  connect() {
    this.closedByUser = false
    const token = this.opts.getAuthToken?.()
    const url = token
      ? `${this.opts.url}${this.opts.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : this.opts.url

    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.startHeartbeat()
    }

    ws.onmessage = (event) => {
      let parsed: unknown
      try { parsed = JSON.parse(event.data) }
      catch { parsed = event.data }
      this.handlers.forEach((h) => h(parsed))
    }

    ws.onclose = () => {
      this.stopHeartbeat()
      if (!this.closedByUser) this.scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  close() {
    this.closedByUser = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  send(payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
    }
  }

  subscribe(handler: MessageHandler): Unsubscribe {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  private scheduleReconnect() {
    const interval = this.opts.reconnectInterval ?? 3000
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, interval)
  }

  private startHeartbeat() {
    const interval = this.opts.heartbeatInterval ?? 30000
    if (interval <= 0) return
    this.heartbeatTimer = window.setInterval(() => {
      this.send(this.opts.heartbeatPayload ?? { type: 'ping' })
    }, interval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}
