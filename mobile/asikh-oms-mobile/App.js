import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'react-native';
import store from './src/store';
import AppNavigator from './src/navigation';
import { theme } from './src/constants/theme';
import { checkAuth } from './src/store/slices/authSlice';

// Root component that will check auth on startup
function Root() {
  useEffect(() => {
    // Check authentication status when app starts
    store.dispatch(checkAuth());
  }, []);

  return (
    <>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <Root />
      </PaperProvider>
    </ReduxProvider>
  );
}
