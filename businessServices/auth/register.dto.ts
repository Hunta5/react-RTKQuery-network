export interface RegisterRequestType {
  password: string
  email: string
  fullName: string
  company: string
}

export interface RegisterResponseType {
  data: {
    message: string
  }
}
