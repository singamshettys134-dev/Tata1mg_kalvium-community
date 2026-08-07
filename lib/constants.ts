// Shared constants with zero dependencies — safe to import from both
// Node-runtime code (API routes, lib/auth.ts) and the Edge runtime
// (middleware.ts). Do NOT import jsonwebtoken, bcryptjs, or anything
// Node-only into this file: middleware.ts needs SESSION_COOKIE_NAME
// without pulling those packages into its Edge bundle.
export const SESSION_COOKIE_NAME = 'prescriptrack_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
