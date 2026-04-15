/**
 * SafeStreets uses a backend-first approach.
 * All API requests go through the backend server.
 * Sensitive credentials (Firebase, Groq, Database) are stored server-side only.
 * 
 * Users of this app don't need any API keys.
 */

export const USE_BACKEND_API = true;