import jwt from 'jsonwebtoken';

// SECURITY: same posture as lib/auth.ts — refuse to run with a missing or
// guessable secret rather than silently falling back to something insecure.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is not set. Refusing to start with an insecure default — set JWT_SECRET to a long, random value.',
  );
}

const JWT_SECRET: string = process.env.JWT_SECRET;

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export type SignupRole = 'DOCTOR' | 'PHARMACIST';

/** Builds the URL we redirect the browser to so the user can approve access. */
export function buildGoogleAuthUrl(params: { redirectUri: string; state: string }): string {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/** Exchanges the one-time authorization code for tokens. */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ access_token: string; id_token: string }> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
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

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

/** Fetches the authenticated user's Google profile. */
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Google profile (${res.status})`);
  }
  return res.json();
}

// ─── "Pending signup" token ──────────────────────────────────────────────
// Issued right after Google verifies identity for someone who does NOT yet
// have an account. Carries just enough to trust the verified email/name on
// the follow-up "complete your profile" step, without re-doing OAuth.

export interface PendingGoogleSignup {
  email: string;
  name: string;
  role: SignupRole;
  googleSub: string;
}

export function signPendingGoogleSignup(payload: PendingGoogleSignup): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function verifyPendingGoogleSignup(token: string): PendingGoogleSignup | null {
  try {
    return jwt.verify(token, JWT_SECRET) as PendingGoogleSignup;
  } catch {
    return null;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set — Google sign-in is not configured.`);
  }
  return value;
}
