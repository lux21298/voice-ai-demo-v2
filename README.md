# Voice AI Demo V2

A complete Next.js voice AI demo for bootcamp consultation workflows. It includes a browser voice interface, mock MCP knowledge search, session handling, analytics endpoints, optional Twilio phone flows, and deployment-ready configuration.

## Features

- Browser voice recording UI with multilingual conversation flow
- OpenAI integration for speech-to-text, chat responses, and text-to-speech
- Demo mode that still builds and runs without API keys
- Local mock MCP endpoint for bootcamp knowledge search
- In-memory cache/session fallback when Upstash Redis is not configured
- Optional Twilio outbound/inbound phone-call routes
- Analytics dashboard and API endpoints
- Production build verified with `next build`

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Upstash Redis, optional
- Twilio, optional
- Recharts, Framer Motion, Lucide React

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app can run in local demo mode with an empty `.env.local`. Add real keys when you want live AI, persistent Redis-backed sessions, or phone calls.

## Environment Variables

Required for real AI features:

```env
OPENAI_API_KEY=sk-...
```

Optional production services:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

See `.env.example` for all supported settings.

## Scripts

```bash
npm run dev         # start development server
npm run build       # production build
npm run start       # run built app
npm run lint        # lint with Next.js rules
npm run typecheck   # TypeScript check
npm run test:quick  # smoke-test a running server
```

For the smoke test, start the app first:

```bash
npm run dev
npm run test:quick
```

Use another URL if needed:

```bash
BASE_URL=http://localhost:3001 npm run test:quick
```

## Main Routes

- `/` - main voice AI interface
- `/dashboard` - analytics dashboard
- `/api/voice` - V1 audio upload voice processing
- `/api/voice/v2` - V2 session-based voice processing
- `/api/mcp` - local mock MCP knowledge search
- `/api/analytics` - analytics metrics and export
- `/api/phone` - optional Twilio call initiation
- `/api/phone/webhook` - optional Twilio webhook
- `/api/phone/speech` - optional Twilio speech handler

## Deployment

The project is ready for Vercel:

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Add environment variables for the production services you want to enable.
4. Deploy.

`OPENAI_API_KEY` is intentionally server-only and is not exposed through `next.config.js`.
