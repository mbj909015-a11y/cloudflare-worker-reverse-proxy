# Cloudflare Worker: Path-Based Reverse Proxy

A small Cloudflare Worker that serves an external app (for example a Replit deployment) under a sub-path of an existing domain, such as `https://example.com/us`, **without changing the origin hosting** of the main site (WordPress/cPanel).

## Why
I used this approach to launch a US version of a web app on a client's existing WordPress domain. The client can republish updates from Replit and they appear on the sub-path automatically.

## What it handles
- Routes only `/<prefix>/*` to the external app; everything else goes to the main site.
- Strips the prefix before forwarding to the app.
- Rewrites `Location` headers so redirects stay on the public domain.
- Rewrites `Set-Cookie` (`Domain`/`Path`) so sessions work through the proxy.
- Sets the `Origin` header to the app's own origin to avoid cross-origin (CSRF) rejections on POST/PUT requests.

## Setup
1. Install Wrangler: `npm install -g wrangler`
2. Edit `wrangler.toml`: set `APP_ORIGIN`, `APP_PREFIX`, and your domain in `routes`.
3. Deploy: `wrangler deploy`

## Cloudflare tips (from real-world use)
- If PUT/POST requests get blocked, check **Security > Events** for WAF Managed Challenges and add a custom **skip rule** scoped to the app path.
- For geo-based redirects (for example US visitors to `/us`), use **Redirect Rules** and exclude bots and logged-in users to protect SEO and admin access.

## Notes
No secrets or real domains are stored in this repo. Replace the placeholders with your own values.

## Stack
Cloudflare Workers · JavaScript · Wrangler
