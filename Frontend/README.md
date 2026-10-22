# Hackathon Starter frontend

Next.js App Router with Ant Design. Use Node.js 22 LTS or newer.

## Setup

Run npm ci. Copy .env.example to .env.local only if .env.local does not already exist. Set NEXT_PUBLIC_API_URL to the backend base URL including /api (for example http://localhost:5000/api). Run npm run dev and open http://localhost:3000. Restart after changing environment values; public environment values are included in production builds.

The backend must allow this frontend's origin with credentialed CORS. Production login cookies require HTTPS and a frontend/API on the same site or a same-origin proxy.

## Pages and structure

- /: project entry page
- /signup: account creation with field validation
- /login: sign in and redirect to /account
- /account: current user and sign out
- src/features/auth: requests, session provider, shared authentication form
- src/lib/api.ts: credentialed requests and structured API errors

Client-side account gating only controls display; the API enforces authentication.

## Checks

Run npm test, npm run typecheck, npm run lint, and npm run build. Use npm start to serve a production build. API helper tests use mocked HTTP responses.

This folder retains its existing Git repository. Dependencies and real environment files are ignored; .env.example is safe to commit.
