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

For production (GitHub Pages), set these as **Repository Variables** in GitHub:
`Settings -> Secrets and variables -> Actions -> Variables`.

## Security Checklist (Required)

1. Lock down Firebase Firestore Rules so only the owner UID can write to `blogPosts`.
2. Restrict Google Calendar API key by HTTP referrer (only your production domains).
3. Enable Formspree spam controls (honeypot/reCAPTCHA, allowed origins).
4. Rotate any keys already exposed in git history and update repository variables.
5. Enable branch protection on `main` and require PR review for content-manager code changes.

Detailed walkthrough: see `SECURITY_SETUP.md`.
