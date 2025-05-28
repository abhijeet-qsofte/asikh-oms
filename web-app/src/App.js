import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';

// Layout components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import BatchesPage from './pages/batches/BatchesPage';
import BatchDetailPage from './pages/batches/BatchDetailPage';
import BatchCreatePage from './pages/batches/BatchCreatePage';
import ReconciliationPage from './pages/reconciliation/ReconciliationPage';
import ReconciliationDetailPage from './pages/reconciliation/ReconciliationDetailPage';
import CratesPage from './pages/crates/CratesPage';
import CrateDetailPage from './pages/crates/CrateDetailPage';
import CrateCreatePage from './pages/crates/CrateCreatePage';
import FarmsPage from './pages/admin/FarmsPage';
import PackhousesPage from './pages/admin/PackhousesPage';
import VarietiesPage from './pages/admin/VarietiesPage';
import UsersPage from './pages/admin/UsersPage';
import NotFoundPage from './pages/NotFoundPage';

// Auth actions
import { checkAuth } from './store/slices/authSlice';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        Loading...
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      
      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          
          {/* Batch Routes */}
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/batches/create" element={<BatchCreatePage />} />
          <Route path="/batches/:id" element={<BatchDetailPage />} />
          
          {/* Reconciliation Routes */}
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/reconciliation/:id" element={<ReconciliationDetailPage />} />
          
          {/* Crate Routes */}
          <Route path="/crates" element={<CratesPage />} />
          <Route path="/crates/create" element={<CrateCreatePage />} />
          <Route path="/crates/:id" element={<CrateDetailPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/farms" element={<FarmsPage />} />
          <Route path="/admin/packhouses" element={<PackhousesPage />} />
          <Route path="/admin/varieties" element={<VarietiesPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
        </Route>
      </Route>
      
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
