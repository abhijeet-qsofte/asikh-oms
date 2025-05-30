import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Card,
  CardContent,
  CardMedia,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  Scale as ScaleIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { getCrateById } from '../../store/slices/crateSlice';
import { format } from 'date-fns';

const CrateDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentCrate: crate, loading, error } = useSelector((state) => state.crates);
  
  useEffect(() => {
    if (id) {
      dispatch(getCrateById(id));
    }
  }, [dispatch, id]);
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'HARVESTED':
        return 'warning';
      case 'IN_TRANSIT':
        return 'info';
      case 'RECEIVED':
        return 'success';
      case 'RECONCILED':
        return 'primary';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {typeof error === 'string' ? error : error?.msg || JSON.stringify(error)}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crates')}
          sx={{ mt: 2 }}
        >
          Back to Crates
        </Button>
      </Container>
    );
  }
  
  if (!crate) {
    return (
      <Container maxWidth="md">
        <Alert severity="info" sx={{ mt: 4 }}>
          Crate not found
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crates')}
          sx={{ mt: 2 }}
        >
          Back to Crates
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crates')}
          sx={{ mb: 2 }}
        >
          Back to Crates
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Crate #{crate.id}
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/crates/${crate.id}/edit`)}
          >
            Edit Crate
          </Button>
        </Box>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  QR Code
                </Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                {crate.qr_code || 'No QR code assigned'}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScaleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Weight Information
                </Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                <strong>Farm Weight:</strong> {crate.farm_weight ? `${crate.farm_weight} kg` : 'Not weighed at farm'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Packhouse Weight:</strong> {crate.packhouse_weight ? `${crate.packhouse_weight} kg` : 'Not weighed at packhouse'}
              </Typography>
              {crate.farm_weight && crate.packhouse_weight && (
                <Typography variant="body1" gutterBottom>
                  <strong>Weight Difference:</strong>{' '}
                  {(crate.farm_weight - crate.packhouse_weight).toFixed(2)} kg
                  {' '}
                  ({(((crate.farm_weight - crate.packhouse_weight) / crate.farm_weight) * 100).toFixed(2)}%)
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Status Information
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={crate.status}
                  color={getStatusColor(crate.status)}
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              {crate.created_at && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created: {format(new Date(crate.created_at), 'PPP p')}
                </Typography>
              )}
              
              {crate.updated_at && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last Updated: {format(new Date(crate.updated_at), 'PPP p')}
                </Typography>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" component="h2" gutterBottom>
                Batch Information
              </Typography>
              {crate.batch ? (
                <>
                  <Typography variant="body1" gutterBottom>
                    <strong>Batch:</strong>{' '}
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => navigate(`/batches/${crate.batch.id}`)}
                    >
                      #{crate.batch.batch_code || crate.batch.id}
                    </Button>
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Farm:</strong> {crate.batch.farm_name || 'N/A'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Variety:</strong> {crate.batch.variety_name || 'N/A'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Harvest Date:</strong>{' '}
                    {crate.batch.harvest_date
                      ? format(new Date(crate.batch.harvest_date), 'PPP')
                      : 'N/A'}
                  </Typography>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  Not assigned to any batch
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>
        
        {/* Images Section */}
        {(crate.farm_image_url || crate.packhouse_image_url) && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Crate Images
            </Typography>
            <Grid container spacing={3}>
              {crate.farm_image_url && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="240"
                      image={crate.farm_image_url}
                      alt="Farm image"
                    />
                    <CardContent>
                      <Typography variant="h6" component="div">
                        Farm Image
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Taken at farm during weighing
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {crate.packhouse_image_url && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="240"
                      image={crate.packhouse_image_url}
                      alt="Packhouse image"
                    />
                    <CardContent>
                      <Typography variant="h6" component="div">
                        Packhouse Image
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Taken at packhouse during reconciliation
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
        
        {/* Notes Section */}
        {crate.notes && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body1">{crate.notes}</Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default CrateDetailPage;
