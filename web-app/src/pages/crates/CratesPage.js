import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { getCrates } from '../../store/slices/crateSlice';

const CratesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { crates, loading, error } = useSelector((state) => state.crates);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    dispatch(getCrates());
  }, [dispatch]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const filteredCrates = Array.isArray(crates) ? crates.filter((crate) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      crate.id.toString().includes(searchLower) ||
      (crate.qr_code && crate.qr_code.toLowerCase().includes(searchLower)) ||
      (crate.batch && crate.batch.farm_name && crate.batch.farm_name.toLowerCase().includes(searchLower))
    );
  }) : [];
  
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
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Crates
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and manage all crates in the system.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <TextField
            placeholder="Search crates..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: '300px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/crates/create')}
          >
            Add Crate
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
        ) : filteredCrates.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <QrCodeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Crates Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm ? 'No crates match your search criteria' : 'Add your first crate to get started'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/crates/create')}
            >
              Add Crate
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>QR Code</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Farm</TableCell>
                  <TableCell>Weight (kg)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCrates.map((crate) => (
                  <TableRow key={crate.id}>
                    <TableCell>{crate.id}</TableCell>
                    <TableCell>{crate.qr_code || 'N/A'}</TableCell>
                    <TableCell>
                      {crate.batch ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => navigate(`/batches/${crate.batch.id}`)}
                        >
                          Batch #{crate.batch.id}
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{crate.batch?.farm_name || 'N/A'}</TableCell>
                    <TableCell>{crate.weight ? `${crate.weight} kg` : 'Not weighed'}</TableCell>
                    <TableCell>
                      <Chip
                        label={crate.status}
                        color={getStatusColor(crate.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton onClick={() => navigate(`/crates/${crate.id}`)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => navigate(`/crates/${crate.id}/edit`)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default CratesPage;
