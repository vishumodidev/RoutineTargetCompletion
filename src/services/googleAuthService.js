/**
 * Google Identity Services (GIS) Authentication Service
 * for RoutineTargetCompletion
 *
 * Implements:
 * - SPA token client initialization via Google Identity Services
 * - Scopes: calendar.events.readonly, tasks.readonly
 * - In-memory access token management (never stored in localStorage or code)
 * - Expiration and disconnect/revocation handling
 * - Zero client secret exposure
 * - Mock mode fallback for local test environments
 */

const GOOGLE_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GOOGLE_CLIENT_ID) || '';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/tasks.readonly'
].join(' ');

export const AUTH_STATUS = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  EXPIRED: 'EXPIRED',
  ERROR: 'ERROR'
};

// In-memory token store (cleared on page reload or disconnect)
let currentSession = {
  status: AUTH_STATUS.DISCONNECTED,
  accessToken: null,
  expiresAt: null,
  userEmail: null,
  error: null,
  isMock: false
};

const listeners = new Set();

function notifyListeners() {
  const state = getAuthState();
  listeners.forEach(fn => {
    try { fn(state); } catch (e) { console.error('Auth listener error:', e); }
  });
}

export function getAuthState() {
  // Check for expiration
  if (currentSession.status === AUTH_STATUS.CONNECTED && currentSession.expiresAt) {
    if (Date.now() >= currentSession.expiresAt) {
      currentSession.status = AUTH_STATUS.EXPIRED;
      currentSession.accessToken = null;
    }
  }

  return {
    status: currentSession.status,
    accessToken: currentSession.accessToken,
    expiresAt: currentSession.expiresAt,
    userEmail: currentSession.userEmail,
    error: currentSession.error,
    isMock: currentSession.isMock,
    isConfigured: !!GOOGLE_CLIENT_ID
  };
}

export function subscribeAuth(callback) {
  listeners.add(callback);
  callback(getAuthState());
  return () => listeners.delete(callback);
}

/**
 * Initiates the Google OAuth authorization flow using GIS Popup
 */
export async function signInWithGoogle() {
  currentSession.error = null;
  currentSession.status = AUTH_STATUS.CONNECTING;
  notifyListeners();

  // If no Google Client ID is configured or GIS SDK is absent, use interactive mock demo mode
  if (!GOOGLE_CLIENT_ID || typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    console.info('VITE_GOOGLE_CLIENT_ID not configured or GIS library absent. Using mock Google account for development/testing.');
    currentSession = {
      status: AUTH_STATUS.CONNECTED,
      accessToken: 'mock_google_token_' + Date.now(),
      expiresAt: Date.now() + 3600 * 1000,
      userEmail: 'vishu@tracker.com',
      error: null,
      isMock: true
    };
    notifyListeners();
    return { success: true, isMock: true };
  }

  return new Promise((resolve) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            const expiresIn = Number(tokenResponse.expires_in) || 3600;
            currentSession = {
              status: AUTH_STATUS.CONNECTED,
              accessToken: tokenResponse.access_token,
              expiresAt: Date.now() + expiresIn * 1000,
              userEmail: 'connected_user@google.com',
              error: null,
              isMock: false
            };
            notifyListeners();
            resolve({ success: true, isMock: false });
          } else {
            currentSession.status = AUTH_STATUS.ERROR;
            currentSession.error = tokenResponse?.error || 'Authentication cancelled';
            notifyListeners();
            resolve({ success: false, error: currentSession.error });
          }
        },
        error_callback: (err) => {
          currentSession.status = AUTH_STATUS.ERROR;
          currentSession.error = err.message || 'OAuth error';
          notifyListeners();
          resolve({ success: false, error: currentSession.error });
        }
      });

      client.requestAccessToken();
    } catch (err) {
      currentSession.status = AUTH_STATUS.ERROR;
      currentSession.error = err.message;
      notifyListeners();
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Disconnects and revokes current Google OAuth session
 */
export async function signOutFromGoogle() {
  const token = currentSession.accessToken;

  if (token && !currentSession.isMock && typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {
        console.log('Google token revoked successfully.');
      });
    } catch (e) {
      console.warn('Failed to revoke Google token:', e);
    }
  }

  currentSession = {
    status: AUTH_STATUS.DISCONNECTED,
    accessToken: null,
    expiresAt: null,
    userEmail: null,
    error: null,
    isMock: false
  };

  notifyListeners();
  return { success: true };
}
