# Domain Setup (GoDaddy + GitHub Pages)

Primary site domain: `www.maxmctavish.com`

Secondary domain: `www.tonshift.co.uk` (set this to forward to the primary domain)

## 1) GoDaddy DNS Records

### For `maxmctavish.com`
Create/update these records in GoDaddy DNS:

- `A` record: host `@` -> `185.199.108.153`
- `A` record: host `@` -> `185.199.109.153`
- `A` record: host `@` -> `185.199.110.153`
- `A` record: host `@` -> `185.199.111.153`
- `CNAME` record: host `www` -> `tavishrox.github.io`

### For `tonshift.co.uk`
Use GoDaddy Forwarding (301 Permanent):

- Forward `tonshift.co.uk` -> `https://www.maxmctavish.com`
- Forward `www.tonshift.co.uk` -> `https://www.maxmctavish.com`

Use **Forward only** and keep path forwarding enabled.

## 2) GitHub Pages

This repo includes `public/CNAME` with:

`www.maxmctavish.com`

After DNS propagates, GitHub Pages will issue HTTPS certs automatically.

## 3) Verification

- `https://www.maxmctavish.com` should load the live site.
- `https://tonshift.co.uk` and `https://www.tonshift.co.uk` should redirect to `https://www.maxmctavish.com`.
- In repo settings: `Settings -> Pages`, confirm custom domain shows `www.maxmctavish.com` and HTTPS is enforced.

## Notes

- GitHub Pages supports one primary custom domain per site.
- If your intended domain is spelled differently (for example `toneshift.co.uk`), update `public/CNAME` and DNS accordingly.
