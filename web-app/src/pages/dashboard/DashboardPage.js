import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  LocalShipping as BatchIcon,
  Inventory as CrateIcon,
  CompareArrows as ReconciliationIcon,
  Agriculture as FarmIcon,
  Warehouse as PackhouseIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../../constants/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch batches for stats with proper error handling
        let batches = [];
        try {
          const batchesResponse = await axios.get(`${API_URL}${ENDPOINTS.BATCHES}`);
          // Check if the response has the expected structure
          if (batchesResponse.data && batchesResponse.data.batches) {
            batches = batchesResponse.data.batches;
          } else if (Array.isArray(batchesResponse.data)) {
            batches = batchesResponse.data;
          } else {
            console.warn('Unexpected batches response format:', batchesResponse.data);
          }
        } catch (batchError) {
          console.error('Error fetching batches:', batchError);
          // Continue with empty batches array instead of failing completely
        }
        
        // Fetch crates for stats with proper error handling
        let crates = [];
        try {
          const cratesResponse = await axios.get(`${API_URL}${ENDPOINTS.CRATES}`);
          // Check if the response has the expected structure
          if (cratesResponse.data && cratesResponse.data.crates) {
            crates = cratesResponse.data.crates;
          } else if (Array.isArray(cratesResponse.data)) {
            crates = cratesResponse.data;
          } else {
            console.warn('Unexpected crates response format:', cratesResponse.data);
          }
        } catch (crateError) {
          console.error('Error fetching crates:', crateError);
          // Continue with empty crates array instead of failing completely
        }
        
        // Calculate batch status stats with safe defaults
        const pendingBatches = batches.filter(batch => batch.status === 'PENDING' || batch.status === 'open').length;
        const dispatchedBatches = batches.filter(batch => batch.status === 'DISPATCHED' || batch.status === 'dispatched' || batch.status === 'in_transit').length;
        const arrivedBatches = batches.filter(batch => batch.status === 'ARRIVED' || batch.status === 'arrived').length;
        const reconciledBatches = batches.filter(batch => batch.status === 'RECONCILED' || batch.status === 'reconciled').length;
        const closedBatches = batches.filter(batch => batch.status === 'CLOSED' || batch.status === 'closed' || batch.status === 'delivered').length;
        
        // Calculate weight stats with safe defaults
        const totalOriginalWeight = batches.reduce((sum, batch) => sum + (batch.total_weight || 0), 0);
        const totalReconciledWeight = batches.reduce((sum, batch) => sum + (batch.reconciled_weight || 0), 0);
        const weightDifferential = totalOriginalWeight - totalReconciledWeight;
        const weightDifferentialPercentage = totalOriginalWeight > 0 
          ? ((weightDifferential / totalOriginalWeight) * 100).toFixed(2)
          : 0;
        
        setStats({
          batches: {
            total: batches.length,
            pending: pendingBatches,
            dispatched: dispatchedBatches,
            arrived: arrivedBatches,
            reconciled: reconciledBatches,
            closed: closedBatches,
          },
          crates: {
            total: crates.length,
            inBatches: crates.filter(crate => crate.batch_id).length,
            available: crates.filter(crate => !crate.batch_id).length,
          },
          weights: {
            originalWeight: totalOriginalWeight,
            reconciledWeight: totalReconciledWeight,
            differential: weightDifferential,
            differentialPercentage: weightDifferentialPercentage,
          }
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Make sure error is a string, not an object
        setError(typeof error === 'object' ? 
          (error.response?.data?.detail || error.message || 'Failed to load dashboard data') : 
          error
        );
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Data for batch status pie chart
  const batchStatusData = {
    labels: ['Pending', 'Dispatched', 'Arrived', 'Reconciled', 'Closed'],
    datasets: [
      {
        data: stats ? [
          stats.batches.pending,
          stats.batches.dispatched,
          stats.batches.arrived,
          stats.batches.reconciled,
          stats.batches.closed,
        ] : [0, 0, 0, 0, 0],
        backgroundColor: [
          '#ff9800', // Pending - Orange
          '#2196f3', // Dispatched - Blue
          '#4caf50', // Arrived - Green
          '#9c27b0', // Reconciled - Purple
          '#9e9e9e', // Closed - Grey
        ],
        borderWidth: 1,
      },
    ],
  };

  // Data for weight comparison bar chart
  const weightComparisonData = {
    labels: ['Original Weight', 'Reconciled Weight', 'Weight Loss'],
    datasets: [
      {
        label: 'Weight (kg)',
        data: stats ? [
          stats.weights.originalWeight,
          stats.weights.reconciledWeight,
          stats.weights.differential,
        ] : [0, 0, 0],
        backgroundColor: [
          'rgba(33, 150, 243, 0.6)', // Blue
          'rgba(76, 175, 80, 0.6)', // Green
          'rgba(244, 67, 54, 0.6)', // Red
        ],
      },
    ],
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Paper elevation={3} sx={{ p: 3, maxWidth: '80%' }}>
          <Typography variant="h6" color="error" gutterBottom>Dashboard Error</Typography>
          <Typography>{error}</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => {
              setError(null);
              setLoading(true);
              window.location.reload();
            }}
          >
            Retry
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {user?.name || 'User'}!
        </Typography>
      </Box>

      {/* Quick Action Cards */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/batches/create')}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <BatchIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" align="center">
                  Create Batch
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Create a new batch for shipping
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/crates/create')}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <CrateIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" align="center">
                  Add Crate
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Register a new crate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/reconciliation')}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <ReconciliationIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" align="center">
                  Reconcile
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Reconcile arrived batches
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/batches')}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <BatchIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" align="center">
                  View Batches
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Manage existing batches
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Overview */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Total Batches
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 'auto' }}>
                {stats?.batches.total || 0}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                backgroundColor: 'secondary.light',
                color: 'secondary.contrastText',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Total Crates
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 'auto' }}>
                {stats?.crates.total || 0}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                backgroundColor: 'success.light',
                color: 'success.contrastText',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Reconciled Batches
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 'auto' }}>
                {stats?.batches.reconciled || 0}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                backgroundColor: 'error.light',
                color: 'error.contrastText',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Weight Loss
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 'auto' }}>
                {stats?.weights.differentialPercentage || 0}%
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Charts */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" gutterBottom>
          Analytics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Batch Status Distribution
              </Typography>
              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                <Pie data={batchStatusData} options={{ maintainAspectRatio: false }} />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Weight Comparison
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  data={weightComparisonData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Weight (kg)'
                        }
                      }
                    }
                  }} 
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Admin Quick Links (only for admin users) */}
      {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'supervisor') && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h6" gutterBottom>
            Administration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => navigate('/admin/farms')}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                  <FarmIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" align="center">
                    Manage Farms
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => navigate('/admin/packhouses')}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                  <PackhouseIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                  <Typography variant="h6" align="center">
                    Manage Packhouses
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {user?.role === 'admin' && (
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 6,
                    },
                  }}
                  onClick={() => navigate('/admin/users')}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <FarmIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                    <Typography variant="h6" align="center">
                      Manage Users
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default DashboardPage;
