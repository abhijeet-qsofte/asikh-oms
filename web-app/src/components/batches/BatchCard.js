import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Grid,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  LocalShipping as BatchIcon,
  Inventory as CrateIcon,
  Scale as ScaleIcon,
  CompareArrows as DifferentialIcon,
  Agriculture as FarmIcon,
  Warehouse as PackhouseIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

// Status colors based on batch status
const getStatusColor = (status) => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'DISPATCHED':
      return 'info';
    case 'ARRIVED':
      return 'success';
    case 'RECONCILED':
      return 'primary';
    case 'CLOSED':
      return 'default';
    default:
      return 'default';
  }
};

// Format status label for display
const formatStatus = (status) => {
  if (status === 'ARRIVED') {
    return 'Arrived';
  }
  return status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown';
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format weight differential
const formatWeightDifferential = (original, reconciled) => {
  if (original === null || original === undefined || reconciled === null || reconciled === undefined) {
    return 'N/A';
  }
  
  const differential = original - reconciled;
  const percentage = original > 0 ? ((differential / original) * 100).toFixed(1) : 0;
  
  return `${differential.toFixed(1)} kg (${percentage}%)`;
};

const BatchCard = ({ batch, onClick }) => {
  // Extract weight details if available
  const originalWeight = batch.weight_details?.original_weight || batch.total_weight || 0;
  const reconciledWeight = batch.weight_details?.reconciled_weight || 0;
  const weightDifferential = originalWeight - reconciledWeight;
  const weightDifferentialPercentage = originalWeight > 0 
    ? ((weightDifferential / originalWeight) * 100).toFixed(1)
    : 0;
  
  // Calculate reconciliation progress
  const totalCrates = batch.crates?.length || 0;
  const reconciledCrates = batch.weight_details?.reconciled_crates || 0;
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        borderLeft: 4,
        borderColor: (theme) => theme.palette.status[batch.status?.toLowerCase() || 'pending'],
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BatchIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6" component="div">
                Batch #{batch.id}
              </Typography>
            </Box>
            <Chip
              label={formatStatus(batch.status)}
              color={getStatusColor(batch.status)}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          </Box>
          
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FarmIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Farm:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {batch.farm?.name || 'N/A'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PackhouseIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Packhouse:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {batch.packhouse?.name || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Grid container spacing={1} sx={{ mb: 1 }}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CrateIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Crates:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {totalCrates}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScaleIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Original Weight:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {originalWeight ? `${originalWeight.toFixed(1)} kg` : 'N/A'}
              </Typography>
            </Grid>
            
            {(batch.status === 'RECONCILED' || batch.status === 'CLOSED') && (
              <>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScaleIcon fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Reconciled:
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {reconciledCrates}/{totalCrates} crates
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Tooltip title="Weight loss during transport">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DifferentialIcon 
                        fontSize="small" 
                        sx={{ 
                          color: weightDifferential > 0 ? 'error.main' : 'success.main',
                          mr: 1 
                        }} 
                      />
                      <Typography variant="body2" color="text.secondary">
                        Weight Loss:
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: weightDifferential > 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    {weightDifferential > 0 
                      ? `${weightDifferential.toFixed(1)} kg (${weightDifferentialPercentage}%)`
                      : 'None'
                    }
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TimeIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {batch.status === 'PENDING' && 'Created: '}
              {batch.status === 'DISPATCHED' && 'Departed: '}
              {batch.status === 'ARRIVED' && 'Arrived: '}
              {batch.status === 'RECONCILED' && 'Reconciled: '}
              {batch.status === 'CLOSED' && 'Closed: '}
              {batch.status === 'PENDING' && formatDate(batch.created_at)}
              {batch.status === 'DISPATCHED' && formatDate(batch.departed_at)}
              {batch.status === 'ARRIVED' && formatDate(batch.arrived_at)}
              {batch.status === 'RECONCILED' && formatDate(batch.reconciled_at)}
              {batch.status === 'CLOSED' && formatDate(batch.closed_at)}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default BatchCard;
