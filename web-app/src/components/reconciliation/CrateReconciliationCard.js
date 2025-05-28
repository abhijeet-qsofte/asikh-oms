import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Grid,
} from '@mui/material';
import {
  Inventory as CrateIcon,
  Scale as ScaleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const CrateReconciliationCard = ({ crate, onSelect }) => {
  const isReconciled = crate.reconciled;
  
  // Calculate weight differential if reconciled
  const weightDifferential = isReconciled && crate.weight && crate.reconciled_weight
    ? crate.weight - crate.reconciled_weight
    : null;
  
  const weightDifferentialPercentage = isReconciled && crate.weight && crate.reconciled_weight && crate.weight > 0
    ? ((weightDifferential / crate.weight) * 100).toFixed(1)
    : null;
  
  return (
    <Card
      sx={{
        height: '100%',
        borderLeft: 4,
        borderColor: isReconciled ? 'success.main' : 'warning.main',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: isReconciled ? 'none' : 'translateY(-4px)',
          boxShadow: isReconciled ? 1 : 4,
        },
      }}
    >
      <CardActionArea 
        onClick={onSelect} 
        disabled={isReconciled}
        sx={{ height: '100%' }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CrateIcon sx={{ color: isReconciled ? 'success.main' : 'warning.main', mr: 1 }} />
              <Typography variant="subtitle1" component="div">
                {crate.qr_code}
              </Typography>
            </Box>
            <Chip
              icon={isReconciled ? <CheckCircleIcon /> : <CancelIcon />}
              label={isReconciled ? 'Reconciled' : 'Pending'}
              color={isReconciled ? 'success' : 'warning'}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          </Box>
          
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Variety:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {crate.variety?.name || 'N/A'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Original Weight:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {crate.weight ? `${crate.weight.toFixed(1)} kg` : 'N/A'}
              </Typography>
            </Grid>
            
            {isReconciled && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reconciled Weight:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {crate.reconciled_weight ? `${crate.reconciled_weight.toFixed(1)} kg` : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Weight Loss:
                  </Typography>
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
          
          {!isReconciled && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mt: 2,
                p: 1,
                bgcolor: 'primary.light',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="primary.dark" sx={{ fontWeight: 500 }}>
                Click to reconcile
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default CrateReconciliationCard;
