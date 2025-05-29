import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import batchReducer from './slices/batchSlice';
import crateReducer from './slices/crateSlice';
import reconciliationReducer from './slices/reconciliationSlice';
import adminReducer from './slices/adminSlice';
import uiReducer from './slices/uiSlice';
import varietyReducer from './slices/varietySlice';
import farmReducer from './slices/farmSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    batches: batchReducer,
    crates: crateReducer,
    reconciliation: reconciliationReducer,
    admin: adminReducer,
    ui: uiReducer,
    varieties: varietyReducer,
    farms: farmReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
