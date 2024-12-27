import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

let authClient: OAuth2Client | null = null;

export async function authenticate(): Promise<OAuth2Client> {
  if (authClient) return authClient;

  try {
    // Create a new OAuth2 client
    authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials if we have them in environment variables
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      authClient.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    } else {
      throw new Error('Google refresh token not found in environment variables');
    }

    return authClient;
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    throw new Error(`Google authentication failed: ${error.message}`);
  }
} 