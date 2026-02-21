# Domain Setup (GoDaddy + GitHub Pages)

Primary site domain: `www.macmctavish.com`

Secondary domain: `www.tonshift.co.uk` (set this to forward to the primary domain)

## 1) GoDaddy DNS Records

### For `macmctavish.com`
Create/update these records in GoDaddy DNS:

- `A` record: host `@` -> `185.199.108.153`
- `A` record: host `@` -> `185.199.109.153`
- `A` record: host `@` -> `185.199.110.153`
- `A` record: host `@` -> `185.199.111.153`
- `CNAME` record: host `www` -> `tavishrox.github.io`

### For `tonshift.co.uk`
Use GoDaddy Forwarding (301 Permanent):

- Forward `tonshift.co.uk` -> `https://www.macmctavish.com`
- Forward `www.tonshift.co.uk` -> `https://www.macmctavish.com`

Use **Forward only** and keep path forwarding enabled.

## 2) GitHub Pages

This repo includes `public/CNAME` with:

`www.macmctavish.com`

After DNS propagates, GitHub Pages will issue HTTPS certs automatically.

## 3) Verification

- `https://www.macmctavish.com` should load the live site.
- `https://tonshift.co.uk` and `https://www.tonshift.co.uk` should redirect to `https://www.macmctavish.com`.
- In repo settings: `Settings -> Pages`, confirm custom domain shows `www.macmctavish.com` and HTTPS is enforced.

## Notes

- GitHub Pages supports one primary custom domain per site.
- If your intended domain is spelled differently (for example `maxmctavish.com` or `toneshift.co.uk`), update `public/CNAME` and DNS accordingly.
