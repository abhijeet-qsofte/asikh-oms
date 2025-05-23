import * as Linking from 'expo-linking';

// Define the linking configuration for your app
export const linkingConfig = {
  prefixes: [
    'asikhoms://', 
    'https://asikhoms.com',
    'https://*.asikhoms.com'
  ],
  config: {
    screens: {
      Login: 'login',
      Home: {
        path: 'home',
        screens: {
          Batches: {
            path: 'batches',
            screens: {
              BatchList: 'list',
              BatchDetail: 'detail/:batchId',
              BatchScan: 'scan',
              BatchForm: 'form',
              ReconciliationDetail: 'reconciliation/:batchId',
            },
          },
          Crates: {
            path: 'crates',
            screens: {
              CrateList: 'list',
              CrateDetail: 'detail/:crateId',
              CrateForm: 'form',
              QRScanner: 'scan',
            },
          },
          Admin: {
            path: 'admin',
            screens: {
              AdminDashboard: 'dashboard',
              UserManagement: 'users',
              FarmManagement: 'farms',
              PackhouseManagement: 'packhouses',
              VarietyManagement: 'varieties',
            },
          },
        },
      },
    },
  },
};

// Helper function to handle deep links
export const handleDeepLink = (url) => {
  // Parse the URL to extract path and parameters
  const { path, queryParams } = Linking.parse(url);
  
  console.log('Received deep link:', { url, path, queryParams });
  
  // Return the parsed data for navigation handling
  return { path, queryParams };
};

// Subscribe to incoming links
export const subscribeToDeepLinks = (callback) => {
  // Handle links that the app was opened with
  Linking.getInitialURL().then((url) => {
    if (url) {
      callback(url);
    }
  }).catch(err => console.error('An error occurred getting the initial URL', err));

  // Handle links when the app is already open
  const subscription = Linking.addEventListener('url', ({ url }) => {
    callback(url);
  });

  // Return the subscription so it can be unsubscribed from
  return subscription;
};

// Function to create deep links to specific screens
export const createDeepLink = (routeName, params = {}) => {
  let path;
  
  // Map route names to paths
  switch (routeName) {
    case 'BatchDetail':
      path = `batches/detail/${params.batchId}`;
      break;
    case 'CrateDetail':
      path = `crates/detail/${params.crateId}`;
      break;
    case 'ReconciliationDetail':
      path = `batches/reconciliation/${params.batchId}`;
      break;
    default:
      // For other routes, use the route name in lowercase
      path = routeName.toLowerCase();
  }
  
  // Create and return the deep link
  return Linking.createURL(path, { queryParams: params });
};
