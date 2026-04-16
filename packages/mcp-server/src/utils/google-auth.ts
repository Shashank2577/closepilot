import { google, Auth } from 'googleapis';

/**
 * Google API authentication configuration
 * Uses service account for server-side operations
 */

let driveClient: ReturnType<typeof google.drive> | null = null;
let docsClient: ReturnType<typeof google.docs> | null = null;

/**
 * Initialize Google API clients with service account authentication
 */
export function initializeGoogleClients() {
  const credentials = getServiceAccountCredentials();

  if (!credentials) {
    throw new Error('Google service account credentials not configured');
  }

  // Create JWT auth client
  const auth = new Auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });

  // Initialize API clients
  driveClient = google.drive({ version: 'v3', auth: auth as any });
  docsClient = google.docs({ version: 'v1', auth: auth as any });
}

/**
 * Get service account credentials from environment
 */
function getServiceAccountCredentials(): {
  clientEmail: string;
  privateKey: string;
} | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
  };
}

/**
 * Get Drive API client (initialized)
 */
export function getDriveClient() {
  if (!driveClient) {
    initializeGoogleClients();
  }
  return driveClient!;
}

/**
 * Get Docs API client (initialized)
 */
export function getDocsClient() {
  if (!docsClient) {
    initializeGoogleClients();
  }
  return docsClient!;
}
