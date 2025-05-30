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
import CrateVarietiesList from '../crates/CrateVarietiesList';
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
    case 'created':
      return 'warning';
    case 'DISPATCHED':
    case 'in_transit':
    case 'departed':
      return 'info';
    case 'ARRIVED':
    case 'arrived':
    case 'delivered':
      return 'success';
    case 'RECONCILED':
    case 'reconciled':
      return 'primary';
    case 'CLOSED':
    case 'closed':
      return 'default';
    default:
      return 'default';
  }
};

// Format status label for display
const formatStatus = (status) => {
  if (!status) return 'Unknown';

  // Convert to lowercase for consistent handling
  const lowercaseStatus = status.toLowerCase();

  // Map status values to display labels
  const statusMap = {
    pending: 'Pending',
    created: 'Created',
    dispatched: 'Dispatched',
    in_transit: 'In Transit',
    departed: 'Departed',
    arrived: 'Arrived',
    delivered: 'Delivered',
    reconciled: 'Reconciled',
    closed: 'Closed',
  };

  return (
    statusMap[lowercaseStatus] ||
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  );
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

const BatchCard = ({ batch, onClick }) => {
  // Helper function to safely get nested properties
  const getNestedValue = (obj, path, defaultValue = 'N/A') => {
    if (!obj) return defaultValue;

    // Handle both string paths and array paths
    const parts = typeof path === 'string' ? path.split('.') : path;

    let result = obj;
    for (const part of parts) {
      if (result == null || result[part] === undefined) {
        return defaultValue;
      }
      result = result[part];
    }

    return result === null || result === undefined ? defaultValue : result;
  };

  // Get farm name from various possible locations in the data structure
  const getFarmName = () => {
    // Try all possible paths where farm name might be stored
    return (
      getNestedValue(batch, 'farm.name') ||
      getNestedValue(batch, 'farm_name') ||
      getNestedValue(batch, 'farm_id.name') ||
      getNestedValue(batch, 'from_location_name') ||
      'N/A'
    );
  };

  // Get packhouse name from various possible locations
  const getPackhouseName = () => {
    return (
      getNestedValue(batch, 'packhouse.name') ||
      getNestedValue(batch, 'packhouse_name') ||
      getNestedValue(batch, 'packhouse_id.name') ||
      getNestedValue(batch, 'to_location_name') ||
      'N/A'
    );
  };

  // Get weight from various possible locations
  const getWeight = () => {
    const weight =
      getNestedValue(batch, 'weight_details.original_weight', null) ||
      getNestedValue(batch, 'total_weight', null) ||
      getNestedValue(batch, 'weight', null) ||
      0;

    return weight > 0 ? `${parseFloat(weight).toFixed(1)} kg` : 'N/A';
  };

  // Debug batch data structure
  console.log('Batch data:', batch);
  console.log('Farm name:', getFarmName());
  console.log('Packhouse name:', getPackhouseName());
  console.log('Weight:', getWeight());

  // Extract weight details if available
  const originalWeight =
    getNestedValue(batch, 'weight_details.original_weight', 0) ||
    getNestedValue(batch, 'total_weight', 0) ||
    getNestedValue(batch, 'weight', 0) ||
    0;
  const reconciledWeight =
    getNestedValue(batch, 'weight_details.reconciled_weight', 0) || 0;
  const weightDifferential = originalWeight - reconciledWeight;
  const weightDifferentialPercentage =
    originalWeight > 0
      ? ((weightDifferential / originalWeight) * 100).toFixed(1)
      : 0;

  // Calculate reconciliation progress
  const totalCrates =
    getNestedValue(batch, 'crates.length', 0) ||
    getNestedValue(batch, 'total_crates', 0) ||
    0;
    
  // The crate varieties functionality has been moved to the CrateVarietiesList component

  // Get reconciliation status if available
  const getReconciliationStatus = () => {
    const reconciledCrates = getNestedValue(
      batch,
      'reconciliation_stats.reconciled_crates',
      0
    );
    const totalCrates = getNestedValue(
      batch,
      'reconciliation_stats.total_crates',
      0
    );

    if (totalCrates === 0) return null;

    const percentage = Math.round((reconciledCrates / totalCrates) * 100);

    // Return an object with text and color based on reconciliation progress
    return {
      text: `${reconciledCrates}/${totalCrates} (${percentage}%)`,
      percentage,
      isComplete: reconciledCrates === totalCrates,
      color:
        reconciledCrates === totalCrates
          ? 'success.main'
          : percentage >= 50
          ? 'warning.main'
          : 'error.main',
    };
  };

  return (
    <Card
      sx={{
        height: '100%',
        borderLeft: 4,
        borderColor: (theme) =>
          theme.palette.status[batch.status?.toLowerCase() || 'pending'],
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BatchIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6" component="div">
                #{batch.batch_code || batch.id}
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
                <FarmIcon
                  fontSize="small"
                  sx={{ color: 'text.secondary', mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Farm:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {getFarmName()}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PackhouseIcon
                  fontSize="small"
                  sx={{ color: 'text.secondary', mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Packhouse:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {getPackhouseName()}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={1} sx={{ mb: 1 }}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CrateIcon
                  fontSize="small"
                  sx={{ color: 'text.secondary', mr: 1 }}
                />
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
                <ScaleIcon
                  fontSize="small"
                  sx={{ color: 'text.secondary', mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Original Weight:
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {getWeight()}
              </Typography>
            </Grid>
            
            {/* Crate Varieties Section - Using the reusable component */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <CrateVarietiesList crates={batch.crates || []} showDivider={true} />
            </Grid>

            {(batch.status === 'RECONCILED' || batch.status === 'CLOSED') && (
              <>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScaleIcon
                      fontSize="small"
                      sx={{ color: 'success.main', mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Reconciled:
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {getReconciliationStatus()?.text || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Tooltip title="Weight loss during transport">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DifferentialIcon
                        fontSize="small"
                        sx={{
                          color:
                            weightDifferential > 0
                              ? 'error.main'
                              : 'success.main',
                          mr: 1,
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
                      color:
                        weightDifferential > 0 ? 'error.main' : 'success.main',
                    }}
                  >
                    {weightDifferential > 0
                      ? `${weightDifferential.toFixed(
                          1
                        )} kg (${weightDifferentialPercentage}%)`
                      : 'None'}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TimeIcon
              fontSize="small"
              sx={{ color: 'text.secondary', mr: 1 }}
            />
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
