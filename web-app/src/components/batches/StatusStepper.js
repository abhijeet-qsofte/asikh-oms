import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Create as CreateIcon,
  LocalShipping as DispatchIcon,
  CheckCircle as ArriveIcon,
  CompareArrows as ReconcileIcon,
  Done as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

// Status steps for the batch workflow
const steps = [
  {
    label: 'Created',
    icon: <CreateIcon />,
    description: 'Batch created and ready for dispatch',
    status: 'PENDING',
  },
  {
    label: 'Dispatched',
    icon: <DispatchIcon />,
    description: 'Batch dispatched from farm to packhouse',
    status: 'DISPATCHED',
  },
  {
    label: 'Arrived',
    icon: <ArriveIcon />,
    description: 'Batch arrived at packhouse',
    status: 'ARRIVED',
  },
  {
    label: 'Reconciled',
    icon: <ReconcileIcon />,
    description: 'Batch crates reconciled at packhouse',
    status: 'RECONCILED',
  },
  {
    label: 'Closed',
    icon: <CloseIcon />,
    description: 'Batch closed and archived',
    status: 'CLOSED',
  },
];

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  } catch (error) {
    return 'Invalid Date';
  }
};

// Get the active step based on batch status
const getActiveStep = (status) => {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'DISPATCHED':
      return 1;
    case 'ARRIVED':
      return 2;
    case 'RECONCILED':
      return 3;
    case 'CLOSED':
      return 4;
    default:
      return 0;
  }
};

const StatusStepper = ({ status, createdAt, departedAt, arrivedAt, reconciledAt, closedAt }) => {
  const activeStep = getActiveStep(status);
  
  // Get timestamp for each step
  const timestamps = [
    createdAt,
    departedAt,
    arrivedAt,
    reconciledAt,
    closedAt,
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((step, index) => {
          const timestamp = timestamps[index];
          const completed = index <= activeStep;
          
          return (
            <Step key={step.label} completed={completed}>
              <StepLabel
                StepIconProps={{
                  icon: step.icon,
                }}
              >
                <Typography variant="subtitle2">{step.label}</Typography>
                {timestamp && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(timestamp)}
                  </Typography>
                )}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {steps[activeStep].description}
        </Typography>
      </Box>
    </Paper>
  );
};

export default StatusStepper;
