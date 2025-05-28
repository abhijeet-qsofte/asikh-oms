import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  LocalShipping as LocalShippingIcon,
  CompareArrows as ReconciliationIcon,
  Agriculture as FarmIcon,
  Warehouse as PackhouseIcon,
  Category as VarietyIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const Sidebar = ({ open }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'supervisor';
  
  const mainMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      roles: ['admin', 'manager', 'supervisor', 'packhouse', 'harvester'],
    },
    {
      text: 'Batches',
      icon: <LocalShippingIcon />,
      path: '/batches',
      roles: ['admin', 'manager', 'supervisor', 'packhouse', 'harvester'],
    },
    {
      text: 'Crates',
      icon: <InventoryIcon />,
      path: '/crates',
      roles: ['admin', 'manager', 'supervisor', 'packhouse', 'harvester'],
    },
    {
      text: 'Reconciliation',
      icon: <ReconciliationIcon />,
      path: '/reconciliation',
      roles: ['admin', 'manager', 'supervisor', 'packhouse'],
    },
  ];
  
  const adminMenuItems = [
    {
      text: 'Farms',
      icon: <FarmIcon />,
      path: '/admin/farms',
      roles: ['admin', 'manager', 'supervisor'],
    },
    {
      text: 'Packhouses',
      icon: <PackhouseIcon />,
      path: '/admin/packhouses',
      roles: ['admin', 'manager', 'supervisor'],
    },
    {
      text: 'Varieties',
      icon: <VarietyIcon />,
      path: '/admin/varieties',
      roles: ['admin', 'manager', 'supervisor'],
    },
    {
      text: 'Users',
      icon: <UsersIcon />,
      path: '/admin/users',
      roles: ['admin'],
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      roles: ['admin'],
    },
  ];
  
  // Filter menu items based on user role
  const filteredMainMenuItems = mainMenuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );
  
  const filteredAdminMenuItems = adminMenuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );
  
  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          mt: 8,
          backgroundColor: '#ffffff',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {filteredMainMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path ? 'primary.dark' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        {filteredAdminMenuItems.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Administration
              </Typography>
            </Box>
            <List>
              {filteredAdminMenuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        color: 'primary.dark',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.dark',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: location.pathname === item.path ? 'primary.dark' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
