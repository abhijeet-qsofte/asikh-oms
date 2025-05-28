import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  LocalShipping as BatchIcon,
  Agriculture as FarmIcon,
  Warehouse as PackhouseIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  } catch (error) {
    return 'Invalid Date';
  }
};

const BatchInfoCard = ({ batch }) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BatchIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" component="div">
              Batch #{batch.id}
            </Typography>
          </Box>
          <Chip
            label="Arrived"
            color="success"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FarmIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Farm:
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {batch.farm?.name || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PackhouseIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Packhouse:
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {batch.packhouse?.name || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimeIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Created:
              </Typography>
            </Box>
            <Typography variant="body2">
              {formatDate(batch.created_at)}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimeIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Departed:
              </Typography>
            </Box>
            <Typography variant="body2">
              {formatDate(batch.departed_at)}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimeIcon fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Arrived:
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatDate(batch.arrived_at)}
            </Typography>
          </Grid>
          
          {batch.notes && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Notes:
              </Typography>
              <Typography variant="body2">
                {batch.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default BatchInfoCard;
