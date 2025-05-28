import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  setCurrentItem,
  clearCurrentItem,
  clearFormError,
} from '../../store/slices/adminSlice';

const UsersPage = () => {
  const dispatch = useDispatch();
  const { data: users, loading, error } = useSelector((state) => state.admin.users);
  const { formLoading, formError, currentItem } = useSelector((state) => state.admin);
  const currentUser = useSelector((state) => state.auth.user);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
  });
  
  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);
  
  useEffect(() => {
    if (currentItem) {
      setFormData({
        name: currentItem.name || '',
        email: currentItem.email || '',
        phone: currentItem.phone || '',
        role: currentItem.role || '',
        password: '', // Don't populate password for security
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        password: '',
      });
    }
  }, [currentItem]);
  
  const handleOpenDialog = (user = null) => {
    if (user) {
      dispatch(setCurrentItem(user));
    } else {
      dispatch(clearCurrentItem());
    }
    setDialogOpen(true);
    setShowPassword(false);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    dispatch(clearFormError());
  };
  
  const handleOpenDeleteDialog = (user) => {
    dispatch(setCurrentItem(user));
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleSubmit = async () => {
    // Prepare data for submission
    const userData = { ...formData };
    
    // If editing and password is empty, remove it from the payload
    if (currentItem && !userData.password) {
      delete userData.password;
    }
    
    if (currentItem) {
      await dispatch(updateUser({ id: currentItem.id, userData }));
    } else {
      await dispatch(createUser(userData));
    }
    
    // Close dialog if no error
    if (!formError) {
      handleCloseDialog();
    }
  };
  
  const handleDelete = async () => {
    if (currentItem) {
      await dispatch(deleteUser(currentItem.id));
      handleCloseDeleteDialog();
    }
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  // Validate phone number format
  const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phone === '' || phoneRegex.test(phone);
  };
  
  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Validate password (only if it's provided or if creating a new user)
  const isValidPassword = (password) => {
    // Password requirements: at least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    
    // If editing a user and password is empty, it's valid (not changing password)
    if (currentItem && password === '') {
      return true;
    }
    
    return passwordRegex.test(password);
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      isValidEmail(formData.email) &&
      isValidPhone(formData.phone) &&
      formData.role.trim() !== '' &&
      isValidPassword(formData.password)
    );
  };
  
  // Get role display name
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'supervisor':
        return 'Supervisor';
      case 'packhouse':
        return 'Packhouse';
      case 'harvester':
        return 'Harvester';
      default:
        return role;
    }
  };
  
  // Get role chip color
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
      case 'supervisor':
        return 'primary';
      case 'packhouse':
        return 'success';
      case 'harvester':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Users
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Add, edit, or delete users in the system.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Users Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first user to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add User
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getRoleDisplayName(user.role)} 
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {/* Don't allow deleting yourself or if you're not an admin */}
                      {currentUser?.id !== user.id && (
                        <Tooltip title="Delete">
                          <IconButton 
                            color="error" 
                            onClick={() => handleOpenDeleteDialog(user)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      
      {/* Add/Edit User Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentItem ? 'Edit User' : 'Add User'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 3, mt: 1 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Full Name"
            fullWidth
            required
            value={formData.name}
            onChange={handleChange}
            error={formData.name.trim() === ''}
            helperText={formData.name.trim() === '' ? 'Name is required' : ''}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={handleChange}
            error={!isValidEmail(formData.email)}
            helperText={!isValidEmail(formData.email) ? 'Enter a valid email address' : ''}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="phone"
            label="Phone Number"
            fullWidth
            value={formData.phone}
            onChange={handleChange}
            error={!isValidPhone(formData.phone)}
            helperText={!isValidPhone(formData.phone) ? 'Enter a valid phone number (10-15 digits, optional + prefix)' : ''}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="role-label" required>Role</InputLabel>
            <Select
              labelId="role-label"
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="Role"
              required
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="packhouse">Packhouse</MenuItem>
              <MenuItem value="harvester">Harvester</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            name="password"
            label={currentItem ? "New Password (leave blank to keep current)" : "Password"}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required={!currentItem}
            value={formData.password}
            onChange={handleChange}
            error={!isValidPassword(formData.password)}
            helperText={!isValidPassword(formData.password) ? 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number' : ''}
            InputProps={{
              endAdornment: (
                <IconButton onClick={toggleShowPassword} edge="end">
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={!isFormValid() || formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the user "{currentItem?.name}" ({currentItem?.email})? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UsersPage;
