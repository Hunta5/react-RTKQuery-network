/**
 * auth 模块的 DTO
 * 字段名跟后端保持一致(snake_case),不在 DTO 层伪装成 camelCase。
 * 见 network/README.md → DTO 文件约定。
 */

export interface LoginDto {
  email: string
  password: string
}

/**
 * 登陆响应 — 注意:
 * baseQueryWithUnwrap 已经把 { code, data, message } 信封剥掉,
 * 这里的字段就是信封里 data 的内容,不要再嵌套一层 data。
 *
 * 当前不返回 profile,profile 通过独立的 getProfile 接口获取(待补)。
 */
export interface LoginResponseDto {
  access_token: string
  refresh_token: string
}
