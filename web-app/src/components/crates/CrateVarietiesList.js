import React from 'react';
import { Box, Chip, Typography, Divider } from '@mui/material';

/**
 * A reusable component to display crate varieties in a batch
 * 
 * @param {Object} props
 * @param {Array} props.crates - Array of crate objects
 * @param {boolean} props.showDivider - Whether to show a divider above the varieties
 * @param {Object} props.sx - Additional styles to apply to the container
 */
const CrateVarietiesList = ({ crates = [], showDivider = true, sx = {} }) => {
  // Helper function to get nested values safely
  const getNestedValue = (obj, path, defaultValue = null) => {
    if (!obj) return defaultValue;
    
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

  // Get crate varieties information
  const getCrateVarieties = () => {
    if (!crates || crates.length === 0) {
      return [];
    }
    
    // Count varieties
    const varietyCounts = {};
    crates.forEach(crate => {
      // Use variety_name if available, otherwise try to get name from variety_id object
      const varietyName = 
        crate.variety_name || 
        getNestedValue(crate, 'variety_obj.name') || 
        'Unknown';
      
      if (!varietyCounts[varietyName]) {
        varietyCounts[varietyName] = 1;
      } else {
        varietyCounts[varietyName]++;
      }
    });
    
    // Convert to array of objects
    return Object.keys(varietyCounts).map(variety => ({
      name: variety,
      count: varietyCounts[variety]
    }));
  };

  const crateVarieties = getCrateVarieties();

  if (crateVarieties.length === 0) {
    return null;
  }

  return (
    <Box sx={{ ...sx }}>
      {showDivider && <Divider sx={{ my: 1 }} />}
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        <strong>Mango Varieties:</strong>
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {crateVarieties.map((variety, index) => (
          <Chip 
            key={index}
            label={`${variety.name}: ${variety.count}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default CrateVarietiesList;
