// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import crateReducer from './slices/crateSlice';
import batchReducer from './slices/batchSlice';
import reconciliationReducer from './slices/reconciliationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    crates: crateReducer,
    batches: batchReducer,
    reconciliation: reconciliationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
