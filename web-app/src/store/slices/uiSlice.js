import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: false,
  darkMode: localStorage.getItem('darkMode') === 'true',
  notifications: [],
  confirmDialog: {
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
      localStorage.setItem('darkMode', state.darkMode);
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    openConfirmDialog: (state, action) => {
      state.confirmDialog = {
        open: true,
        title: action.payload.title || 'Confirm',
        message: action.payload.message || 'Are you sure?',
        onConfirm: action.payload.onConfirm || null,
        onCancel: action.payload.onCancel || null,
      };
    },
    closeConfirmDialog: (state) => {
      state.confirmDialog = {
        ...state.confirmDialog,
        open: false,
      };
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleDarkMode,
  setDarkMode,
  addNotification,
  removeNotification,
  clearNotifications,
  openConfirmDialog,
  closeConfirmDialog,
} = uiSlice.actions;

export default uiSlice.reducer;
