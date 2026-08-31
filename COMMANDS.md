# Web App Commands

## Development

```bash
bun install          # install dependencies
bun run dev          # start dev server at http://localhost:8080
```

## Build & Preview

```bash
bun run build        # production build (Nitro/Vite)
bun run build:dev    # build in development mode
bun run preview      # preview the production build locally
```

## Database

```bash
bun run db:migrate        # apply pending migrations
bun run db:generate       # generate a new migration after schema changes
bun run db:studio         # open Drizzle Studio (visual DB explorer)
bun run db:reset          # wipe and re-migrate (destructive — local only)
bun run db:backfill-names # backfill display names on existing records
bun run db:backfill-owner # set the portfolio owner flag on existing records
```

## Code Quality

```bash
bun run lint         # run ESLint
bun run format       # run Prettier (auto-fix)
```

## Environment

Copy `.dev.vars.example` to `.dev.vars` and fill in:

| Variable | Where to get it |
|---|---|
| `TURSO_DATABASE_URL` | [turso.tech](https://turso.tech) dashboard |
| `TURSO_AUTH_TOKEN` | [turso.tech](https://turso.tech) dashboard |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:8080` for local, your domain for prod |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GITHUB_CLIENT_ID` | GitHub → Settings → Developer settings → OAuth Apps |
| `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps |
| `RESEND_API_KEY` | [resend.com](https://resend.com) dashboard (email verification) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) (AI insights, optional) |

## Deploying to Vercel

1. Push to GitHub and import in [vercel.com/new](https://vercel.com/new)
2. Add all `.dev.vars` values as environment variables in the Vercel dashboard
3. Set `BETTER_AUTH_URL` to your production domain (e.g. `https://stocktracker.example.com`)
4. Add `https://yourdomain.com/api/auth/callback/google` as an authorised redirect URI in Google Cloud Console
5. Add `https://yourdomain.com/api/auth/callback/github` in your GitHub OAuth app
