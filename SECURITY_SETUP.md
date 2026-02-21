# Security Setup Checklist

## 1) Rotate Google Calendar API Key (Do This First)

1. Open Google Cloud Console: `APIs & Services -> Credentials`.
2. Find key previously exposed in git history and click **Delete** (or Restrict immediately, then replace).
3. Create a new API key.
4. Restrict this key:
   - API restrictions: **Google Calendar API** only.
   - Application restrictions: **HTTP referrers (web sites)**.
   - Allowed referrers:
     - `https://tavishrox.github.io/*`
     - add your custom domain when you have one.

## 2) Update GitHub Actions Variables

Repository -> `Settings -> Secrets and variables -> Actions -> Variables`

Set:
- `VITE_AUTHORIZED_ID`
- `VITE_FORM_ENDPOINT`
- `VITE_GCAL_API_KEY`
- `VITE_GCAL_ID`

## 3) Apply Firestore Rules

Use `firestore.rules` in this repo.

Console path: `Firebase Console -> Firestore Database -> Rules`

Paste and publish the rules from `firestore.rules`.

## 4) Formspree Hardening

In Formspree project settings:
- Enable anti-spam/reCAPTCHA (if available).
- Restrict allowed origins to your production domain(s).
- Enable email notifications and rate-limit settings.

## 5) GitHub Protection Status

This repo now has:
- branch protection on `main`
- 1 required approving review
- admin enforcement
- force-push and deletion blocked
- conversation resolution required
- Dependabot security updates enabled
- secret scanning + push protection enabled
