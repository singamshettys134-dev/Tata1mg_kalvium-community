// Shared constants with zero dependencies — safe to import from both
// Node-runtime code (API routes, lib/auth.ts) and the Edge runtime
// (middleware.ts). Do NOT import jsonwebtoken, bcryptjs, or anything
// Node-only into this file: middleware.ts needs SESSION_COOKIE_NAME
// without pulling those packages into its Edge bundle.
export const SESSION_COOKIE_NAME = 'prescriptrack_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Google OAuth: short-lived anti-CSRF state cookie set by /api/auth/google
// and checked by /api/auth/google/callback.
export const GOOGLE_STATE_COOKIE_NAME = 'prescriptrack_google_state';
export const GOOGLE_STATE_MAX_AGE = 10 * 60; // 10 minutes in seconds
