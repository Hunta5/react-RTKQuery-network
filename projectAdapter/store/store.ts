import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import type { Middleware } from '@reduxjs/toolkit'
import { rtkQueryLogger } from 'network/core/middleware/rtkQueryErrorLogger'
import { baseApi } from 'network/core/api/baseApi'
import authReducer from './auth'

const extraMiddlewares: Middleware[] = []

if (process.env.NODE_ENV === 'development') {
  extraMiddlewares.push(rtkQueryLogger)
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(
      baseApi.middleware,
      ...extraMiddlewares,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
