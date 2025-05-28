import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

const drawerWidth = 240;

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Sidebar variant: overlay on mobile, persistent on desktop
  const sidebarVariant = isMobile ? 'temporary' : 'persistent';

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <Sidebar open={sidebarOpen} variant={sidebarVariant} onClose={toggleSidebar} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          overflow: 'auto',
          backgroundColor: (theme) => theme.palette.background.default,
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(isMobile
            ? { width: '100vw', ml: 0 }
            : sidebarOpen
              ? { marginLeft: `${drawerWidth}px`, width: `calc(100vw - ${drawerWidth}px)` }
              : { marginLeft: 0, width: '100vw' }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
