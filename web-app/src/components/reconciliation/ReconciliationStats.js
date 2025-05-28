import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Scale as ScaleIcon,
  CompareArrows as DifferentialIcon,
} from '@mui/icons-material';

const ReconciliationStats = ({ reconciled, total, originalWeight, reconciledWeight }) => {
  // Calculate weight differential
  const weightDifferential = originalWeight - reconciledWeight;
  const weightDifferentialPercentage = originalWeight > 0 
    ? ((weightDifferential / originalWeight) * 100).toFixed(1)
    : 0;
  
  // Calculate reconciliation progress
  const progressPercentage = total > 0 ? (reconciled / total) * 100 : 0;
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Reconciliation Stats
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Crates Reconciled:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {reconciled}/{total}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ScaleIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Original Weight:
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {originalWeight ? `${originalWeight.toFixed(1)} kg` : 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ScaleIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Reconciled Weight:
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {reconciledWeight ? `${reconciledWeight.toFixed(1)} kg` : 'N/A'}
            </Typography>
          </Grid>
          
          {reconciledWeight > 0 && (
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: weightDifferential > 0 ? 'error.light' : 'success.light',
                  borderRadius: 1,
                  mt: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DifferentialIcon 
                    fontSize="small" 
                    sx={{ 
                      color: weightDifferential > 0 ? 'error.dark' : 'success.dark',
                      mr: 1 
                    }} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Weight Differential:
                  </Typography>
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 500,
                    color: weightDifferential > 0 ? 'error.dark' : 'success.dark'
                  }}
                >
                  {weightDifferential > 0 
                    ? `${weightDifferential.toFixed(1)} kg (${weightDifferentialPercentage}% loss)`
                    : 'No weight loss'
                  }
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ReconciliationStats;
