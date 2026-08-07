import jwt from 'jsonwebtoken';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './constants';

// SECURITY: never fall back to a hardcoded secret. A guessable default lets
// anyone forge a valid session token (including ADMIN role) for any account.
// Every environment (local, CI, and production) must set JWT_SECRET explicitly.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is not set. Refusing to start with an insecure default — set JWT_SECRET to a long, random value.',
  );
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const SESSION_COOKIE = SESSION_COOKIE_NAME;

export interface TokenPayload {
  userId: string;
  role: string;
  profileId: string;
  iat?: number;
  exp?: number;
}

// ─── Token helpers ─────────────────────────────────────────────────────────────

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Request extraction ─────────────────────────────────────────────────────────

export function getTokenFromRequest(request: Request): string | null {
  // 1. Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  // 2. Cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [k, v] = part.trim().split('=');
      if (k === SESSION_COOKIE && v) return decodeURIComponent(v);
    }
  }
  return null;
}

export function getAuthUser(request: Request): TokenPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// ─── Role guards ────────────────────────────────────────────────────────────────

export function requireAuth(request: Request): { user: TokenPayload; error: null } | { user: null; error: string } {
  const user = getAuthUser(request);
  if (!user) return { user: null, error: 'Unauthorized' };
  return { user, error: null };
}

export function requireRole(
  request: Request,
  role: string,
): { user: TokenPayload; error: null } | { user: null; error: string } {
  const result = requireAuth(request);
  if (result.error) return result;
  if (result.user.role !== role) return { user: null, error: 'Forbidden' };
  return { user: result.user, error: null };
}

// ─── Cookie builder ─────────────────────────────────────────────────────────────
// Re-exported from ./constants so existing `import { SESSION_COOKIE_NAME } from
// '@/lib/auth'` call sites (the API routes) keep working unchanged.
export { SESSION_COOKIE_NAME, SESSION_MAX_AGE };
