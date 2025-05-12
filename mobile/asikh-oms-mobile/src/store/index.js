import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import crateReducer from './slices/crateSlice';
import batchReducer from './slices/batchSlice';
import adminReducer from './slices/adminSlice';
//import reconciliationReducer from './slices/reconciliationSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    crates: crateReducer,
    batches: batchReducer,
    admin: adminReducer,
    //reconciliation: reconciliationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
