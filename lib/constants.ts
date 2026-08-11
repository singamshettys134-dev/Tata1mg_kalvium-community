// Shared constants with zero dependencies — safe to import from both
// Node-runtime code (API routes, lib/auth.ts) and the Edge runtime
// (middleware.ts). Do NOT import jsonwebtoken, bcryptjs, or anything
// Node-only into this file: middleware.ts needs SESSION_COOKIE_NAME
// without pulling those packages into its Edge bundle.
export const SESSION_COOKIE_NAME = 'prescriptrack_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Google OAuth flow cookies — short-lived, only alive during the redirect
// round-trip to Google and back (and briefly after, while the user finishes
// the "complete your profile" step for a brand-new signup).
export const GOOGLE_STATE_COOKIE_NAME = 'prescriptrack_google_state';
export const GOOGLE_STATE_MAX_AGE = 10 * 60; // 10 minutes
export const GOOGLE_PENDING_COOKIE_NAME = 'prescriptrack_google_pending';
export const GOOGLE_PENDING_MAX_AGE = 15 * 60; // 15 minutes
