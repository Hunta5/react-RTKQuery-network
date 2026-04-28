/**
 * order 模块的 tag 常量
 * - ORDER_TAG_TYPES:供 enhanceEndpoints({ addTagTypes }) 使用
 * - OrderListTag / orderTag:具体 tag 字面量,避免在 endpoint 里写魔法字符串
 */
export const ORDER_TAG_TYPES = ['Order', 'OrderItem'] as const
export type OrderTagType = typeof ORDER_TAG_TYPES[number]

export const OrderListTag = { type: 'Order' as const, id: 'LIST' as const }
export const orderTag = (id: string | number) => ({ type: 'Order' as const, id })

export const OrderItemListTag = { type: 'OrderItem' as const, id: 'LIST' as const }
export const orderItemTag = (id: string | number) => ({ type: 'OrderItem' as const, id })
