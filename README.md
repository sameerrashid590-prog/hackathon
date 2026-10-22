# Hackathon Starter

Next.js frontend with Ant Design and an Express/MongoDB authentication API.

## Requirements and setup

Use Node.js 22 LTS or newer and an accessible MongoDB database. Install each application's dependencies with npm ci in Backend and Frontend. Copy Backend/.env.example to Backend/.env and Frontend/.env.example to Frontend/.env.local only if those files do not already exist. Replace the sample JWT secret with a long random value. Never commit real secrets.

Start the API with npm run dev from Backend and the frontend with npm run dev from Frontend. Open http://localhost:3000. API health is available at http://localhost:5000/api/health. Environment changes require restarting the relevant server; NEXT_PUBLIC_API_URL is included in frontend builds.

## Structure

- Backend/src/server.js: startup, environment validation, graceful shutdown
- Backend/src/app.js: HTTP middleware and route mounting
- Backend/src/config, models, middleware, routes, controllers, services, schemas: API layers
- Backend/test: authentication regression tests with mocked database operations
- Frontend/src/app: home, signup, login, and account pages
- Frontend/src/features/auth: authentication requests, session provider, shared form
- Frontend/src/lib/api.ts: credentialed HTTP requests and structured API errors

Backend/index.js is a compatibility launcher for the same server. Prefer npm run dev or npm start.

## Authentication

Signup creates an account; login sets an HTTP-only cookie valid for one day. The frontend loads /api/auth/me on startup, and logout clears the cookie. Passwords require at least eight characters and at most 72 UTF-8 bytes. Names are trimmed and require 2–80 characters; emails are normalized on the server.

POST /api/auth/signup, /login, and /logout; GET /api/auth/me. Authentication paths are relative to /api/auth.

## Verification

From Backend run npm test. From Frontend run npm test, npm run typecheck, npm run lint, and npm run build. Backend tests do not connect to MongoDB or write real user data.

## Deployment

Set NODE_ENV=production and use HTTPS for secure cookies. FRONTEND_URL must be the frontend origin without a trailing slash. The current SameSite=Lax cookie setup expects the frontend and API to be on the same site (for example app.example.com and api.example.com), or behind a same-origin proxy. Unrelated frontend/API domains require a separately designed cross-site cookie and CSRF strategy.

Rate limits are 10 signup and 20 login attempts per IP per 15 minutes, stored in memory. They reset when the server restarts. For multiple API instances, use a shared rate-limit store. Behind a reverse proxy, configure Express trust proxy for the exact trusted proxy topology before relying on per-client IP limits; it is intentionally disabled by default.

MongoDB's unique email index is required; provision it during deployment. Duplicate-key conflicts are returned as HTTP 409. Frontend account gating is a display convenience; private data must always be protected by backend authentication middleware.

## Version control

Frontend and Backend are maintained as separate Git repositories. Existing frontend history is preserved. No files were staged or committed automatically. Each repository ignores real environment files and dependencies while allowing .env.example. The workspace root README and .gitignore are local workspace documentation.
