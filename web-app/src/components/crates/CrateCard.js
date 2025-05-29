import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Grid,
  Divider,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Scale as ScaleIcon,
  LocalShipping as BatchIcon,
  Agriculture as FarmIcon,
  Category as VarietyIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

/**
 * CrateCard component for displaying crate information in a card format
 * with collapsible details, QR code display, and edit functionality
 */
const CrateCard = ({ crate, varieties, farms, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editedCrate, setEditedCrate] = useState({ ...crate });
  
  // Handle card expansion toggle
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  // Handle edit mode toggle
  const handleEditClick = () => {
    setEditing(true);
    setEditedCrate({ ...crate });
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditing(false);
    setEditedCrate({ ...crate });
  };
  
  // Handle save edit
  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(editedCrate);
    }
    setEditing(false);
  };
  
  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(crate.id);
    }
  };
  
  // Handle QR code dialog
  const handleQrDialogOpen = () => {
    setQrDialogOpen(true);
  };
  
  const handleQrDialogClose = () => {
    setQrDialogOpen(false);
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedCrate({
      ...editedCrate,
      [name]: value,
    });
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
  
  // Get variety name by ID
  const getVarietyName = (varietyId) => {
    if (!varietyId || !varieties) return 'N/A';
    const variety = varieties.find(v => v.id === varietyId);
    return variety ? variety.name : 'Unknown';
  };
  
  // Get farm name by ID
  const getFarmName = (farmId) => {
    if (!farmId || !farms) return 'N/A';
    const farm = farms.find(f => f.id === farmId);
    return farm ? farm.name : 'Unknown';
  };
  
  // Get status chip color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'success';
      case 'assigned':
        return 'primary';
      case 'reconciled':
        return 'info';
      case 'damaged':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Render QR code dialog
  const renderQrDialog = () => (
    <Dialog open={qrDialogOpen} onClose={handleQrDialogClose}>
      <DialogTitle>QR Code: {crate.qr_code}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" p={2}>
          <QRCodeSVG 
            value={crate.qr_code} 
            size={200} 
            level="H" 
            includeMargin={true}
          />
          <Typography variant="body1" mt={2}>
            {crate.qr_code}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleQrDialogClose}>Close</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => {
            // Create a downloadable link for the QR code
            const svgElement = document.querySelector("svg");
            
            if (svgElement) {
              // Get the SVG data
              const svgData = new XMLSerializer().serializeToString(svgElement);
              const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
              const svgUrl = URL.createObjectURL(svgBlob);
              
              const downloadLink = document.createElement("a");
              downloadLink.href = svgUrl;
              downloadLink.download = `qrcode-${crate.qr_code}.svg`;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(svgUrl);
            } else {
              console.error('SVG element not found');
            }
          }}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <>
      <Card 
        elevation={2} 
        sx={{ 
          mb: 2,
          borderLeft: 4,
          borderColor: getStatusColor(crate.status),
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          },
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="div">
                {crate.qr_code}
              </Typography>
            </Box>
            
            <Chip 
              label={crate.status || 'Unknown'} 
              color={getStatusColor(crate.status)}
              size="small"
            />
          </Box>
          
          <Box mt={1} display="flex" alignItems="center">
            <VarietyIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {getVarietyName(crate.variety_id)}
            </Typography>
          </Box>
          
          <Box mt={0.5} display="flex" alignItems="center">
            <ScaleIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {crate.weight ? `${crate.weight.toFixed(1)} kg` : 'N/A'}
            </Typography>
          </Box>
          
          {crate.batch_id && (
            <Box mt={0.5} display="flex" alignItems="center">
              <BatchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Batch #{crate.batch_id}
              </Typography>
            </Box>
          )}
        </CardContent>
        
        <CardActions disableSpacing sx={{ pt: 0 }}>
          <IconButton onClick={handleQrDialogOpen} size="small" title="View QR Code">
            <QrCodeIcon fontSize="small" />
          </IconButton>
          
          <IconButton onClick={handleEditClick} size="small" title="Edit Crate" disabled={editing}>
            <EditIcon fontSize="small" />
          </IconButton>
          
          <IconButton onClick={handleDelete} size="small" title="Delete Crate" disabled={editing}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          
          <Box flexGrow={1} />
          
          <IconButton
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </CardActions>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />
          <CardContent>
            {editing ? (
              // Edit form
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="QR Code"
                    name="qr_code"
                    value={editedCrate.qr_code || ''}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                    disabled // QR code should not be editable
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Weight (kg)"
                    name="weight"
                    type="number"
                    value={editedCrate.weight || ''}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Variety</InputLabel>
                    <Select
                      name="variety_id"
                      value={editedCrate.variety_id || ''}
                      onChange={handleChange}
                      label="Variety"
                    >
                      {varieties?.map(variety => (
                        <MenuItem key={variety.id} value={variety.id}>
                          {variety.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Farm</InputLabel>
                    <Select
                      name="farm_id"
                      value={editedCrate.farm_id || ''}
                      onChange={handleChange}
                      label="Farm"
                    >
                      {farms?.map(farm => (
                        <MenuItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={editedCrate.status || ''}
                      onChange={handleChange}
                      label="Status"
                    >
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="assigned">Assigned</MenuItem>
                      <MenuItem value="reconciled">Reconciled</MenuItem>
                      <MenuItem value="damaged">Damaged</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    name="notes"
                    value={editedCrate.notes || ''}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                    multiline
                    rows={2}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" mt={1}>
                    <Button 
                      startIcon={<CancelIcon />}
                      onClick={handleCancelEdit} 
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              // Detail view
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    QR Code:
                  </Typography>
                  <Typography variant="body1">
                    {crate.qr_code}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Weight:
                  </Typography>
                  <Typography variant="body1">
                    {crate.weight ? `${crate.weight.toFixed(1)} kg` : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Variety:
                  </Typography>
                  <Typography variant="body1">
                    {getVarietyName(crate.variety_id)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Farm:
                  </Typography>
                  <Typography variant="body1">
                    {getFarmName(crate.farm_id)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body1">
                    {crate.status || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(crate.created_at)}
                  </Typography>
                </Grid>
                
                {crate.batch_id && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Batch:
                    </Typography>
                    <Typography variant="body1">
                      #{crate.batch_id}
                    </Typography>
                  </Grid>
                )}
                
                {crate.reconciled_at && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Reconciled:
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(crate.reconciled_at)}
                    </Typography>
                  </Grid>
                )}
                
                {crate.reconciled_weight && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Reconciled Weight:
                    </Typography>
                    <Typography variant="body1">
                      {crate.reconciled_weight.toFixed(1)} kg
                    </Typography>
                  </Grid>
                )}
                
                {crate.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Notes:
                    </Typography>
                    <Typography variant="body1">
                      {crate.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Collapse>
      </Card>
      
      {/* QR Code Dialog */}
      {renderQrDialog()}
    </>
  );
};

export default CrateCard;
