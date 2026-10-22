# Authentication API

Express and MongoDB backend for Hackathon Starter. Use Node.js 22 LTS or newer.

## Setup

Run npm ci. If .env does not already exist, copy .env.example to .env. Set MONGODB_URI, a random JWT_SECRET of at least 32 characters, and FRONTEND_URL (an HTTP(S) origin without a trailing slash). PORT defaults to 5000. Never commit real credentials.

Run npm run dev for watch mode or npm start for normal startup. GET /api/health checks the API. All source lives under src; index.js is a compatibility launcher for src/server.js.

## Endpoints

- POST /api/auth/signup: name, email, password; creates an account
- POST /api/auth/login: email, password; sets an HTTP-only session cookie
- GET /api/auth/me: returns the authenticated user
- POST /api/auth/logout: clears the session cookie

Names require 2–80 trimmed characters; emails are normalized. Passwords require at least eight characters and at most 72 UTF-8 bytes. The unique email index must be provisioned in MongoDB. Duplicate-key errors return 409.

## Checks and deployment

Run npm test. Tests use mocked database operations and do not create real users.

Use NODE_ENV=production and HTTPS. Cookies use SameSite=Lax and expect the frontend and API on the same site, such as app.example.com and api.example.com, or behind a same-origin proxy. Unrelated domains require a separate cross-site cookie and CSRF strategy.

Signup is limited to 10 attempts and login to 20 attempts per IP per 15 minutes. The limiter is in memory and resets on restart; use a shared store for multiple instances. Express trust proxy is disabled; configure it for your exact trusted proxy topology if deployed behind a proxy.

This folder is a separate Git repository. Dependencies and real environment files are ignored. No files were automatically staged or committed.
