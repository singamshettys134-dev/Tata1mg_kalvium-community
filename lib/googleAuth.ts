// Minimal Google OAuth 2.0 (Authorization Code flow) helper.
// No next-auth / googleapis dependency — plain fetch calls, so it drops
// straight into the app's existing custom JWT + cookie session system
// (see lib/auth.ts) instead of running a parallel auth stack.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set. Google sign-in is not configured.`);
  }
  return value;
}

export function getGoogleRedirectUri(): string {
  return requireEnv('GOOGLE_REDIRECT_URI');
}

/** Builds the URL to send the browser to for the Google consent screen. */
export function buildGoogleAuthUrl(state: string): string {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const redirectUri = getGoogleRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string; // stable Google user id
  email: string;
  email_verified: boolean;
  name?: string;
}

/** Exchanges the ?code=... from the callback for the signed-in user's profile. */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = getGoogleRedirectUri();

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error(`Google userinfo fetch failed: ${profileRes.status} ${await profileRes.text()}`);
  }

  const profile = (await profileRes.json()) as GoogleProfile;

  if (!profile.email || !profile.email_verified) {
    throw new Error('Google account has no verified email.');
  }

  return profile;
}
