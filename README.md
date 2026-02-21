# Max McTavish Website

Live site: `https://tavishrox.github.io/max-live-website/`

## Local Development

```bash
npm install
npm run dev
```

## Build and Lint

```bash
npm run lint
npm run build
```

## Deployment

Deployment is automated with GitHub Actions in `.github/workflows/deploy.yml`.
Every push to `main` builds and deploys to GitHub Pages.

Custom domain setup instructions are in `DOMAIN_SETUP.md`.

## Runtime Variables

Copy `.env.example` to `.env` for local overrides:

```bash
cp .env.example .env
```

Variables used by the app:
- `VITE_AUTHORIZED_ID`
- `VITE_FORM_ENDPOINT`
- `VITE_GCAL_API_KEY`
- `VITE_GCAL_ID`
- `VITE_YT_CHANNEL_ID` (optional, defaults to `@maxmctavish` channel ID)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

## YouTube Latest Videos (No API Quota)

The videos section reads the latest uploads from YouTube's public channel RSS feed (no YouTube Data API key required).
If the feed cannot be fetched, the app falls back to the hardcoded `PERMANENT_VIDEOS` list.

For production (GitHub Pages), set these as **Repository Variables** in GitHub:
`Settings -> Secrets and variables -> Actions -> Variables`.

## Journal Manager Workflow

- Open **Manager** in the site nav.
- Sign in with the owner Google account.
- Create/edit/delete blog posts in the Content Manager UI.
- Upload blog images directly (stored in Firebase Storage) or paste an external image URL.

## Security Checklist (Required)

1. Lock down Firebase Firestore Rules so only the owner UID can write to `blogPosts`.
2. Restrict Google Calendar API key by HTTP referrer (only your production domains).
3. Enable Formspree spam controls (honeypot/reCAPTCHA, allowed origins).
4. Rotate any keys already exposed in git history and update repository variables.
5. Enable branch protection on `main` and require PR review for content-manager code changes.

Detailed walkthrough: see `SECURITY_SETUP.md`.
