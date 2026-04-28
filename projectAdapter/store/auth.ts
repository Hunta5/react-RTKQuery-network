import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import AuthStorage, { UserProfile } from 'network/core/storage/authStorage'

interface AuthState {
  isAuthenticated: boolean
  profile: UserProfile | null
}

const initialState: AuthState = {
  isAuthenticated: AuthStorage.isAuthenticated(),
  profile: AuthStorage.getProfile(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload
      state.isAuthenticated = true
    },
    reset: (state) => {
      state.profile = null
      state.isAuthenticated = false
    },
    syncFromStorage: (state) => {
      state.isAuthenticated = AuthStorage.isAuthenticated()
      state.profile = AuthStorage.getProfile()
    },
  },
})

export const { setProfile, reset, syncFromStorage } = authSlice.actions
export default authSlice.reducer
