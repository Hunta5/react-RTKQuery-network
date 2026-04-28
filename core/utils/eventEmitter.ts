
type Handler<T = any> = (payload: T) => void

export class EventEmitter<Events extends Record<string, any>> {
  private handlers = new Map<keyof Events, Set<Handler>>()

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler as Handler)
    // 返回取消订阅函数
    return () => this.off(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers.get(event)?.forEach(h => {
      try { h(payload) } catch (e) { console.error(e) }
    })
  }
}
