import AuthStorage from 'network/core/storage/authStorage'
import { baseApi } from 'network/core/api/baseApi'
import { store } from './store'
import { setProfile, reset, syncFromStorage } from './auth'

let registered = false

export function registerAuthSubscribers() {
  if (registered) return
  registered = true

  AuthStorage.events.on('auth:login', ({ profile }) => {
    store.dispatch(setProfile(profile))
  })

  AuthStorage.events.on('profile:set', (profile) => {
    store.dispatch(setProfile(profile))
  })

  AuthStorage.events.on('auth:cleared', () => {
    store.dispatch(reset())
    store.dispatch(baseApi.util.resetApiState())
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'access_token' || e.key === 'user_profile') {
        store.dispatch(syncFromStorage())
      }
    })
  }
}
