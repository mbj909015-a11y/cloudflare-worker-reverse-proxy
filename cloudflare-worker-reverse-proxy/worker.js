/**
 * Cloudflare Worker: path-based reverse proxy
 *
 * Serves an external app (e.g. a Replit deployment) under a sub-path of an
 * existing domain (e.g. https://example.com/us) without touching the origin
 * hosting of the main site.
 *
 * Config (set in wrangler.toml [vars] or the Cloudflare dashboard):
 *   APP_ORIGIN  - origin of the external app, e.g. https://my-app.replit.app
 *   APP_PREFIX  - public sub-path, e.g. /us
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = env.APP_PREFIX || "/us";
    const appOrigin = new URL(env.APP_ORIGIN);

    // Only handle requests under the prefix; everything else goes to the main site.
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) {
      return fetch(request);
    }

    // Build the upstream URL: strip the prefix and point at the app origin.
    const upstreamPath = url.pathname.slice(prefix.length) || "/";
    const upstreamUrl = new URL(upstreamPath + url.search, appOrigin);

    // Forward the request with adjusted headers.
    const headers = new Headers(request.headers);
    headers.set("Host", appOrigin.host);
    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
    // Many apps reject cross-origin writes (CSRF); present the app's own origin.
    if (headers.has("Origin")) headers.set("Origin", appOrigin.origin);

    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    const upstreamResponse = await fetch(upstreamRequest);
    const response = new Response(upstreamResponse.body, upstreamResponse);

    // Rewrite redirects so users stay on the public domain + prefix.
    const location = response.headers.get("Location");
    if (location) {
      const loc = new URL(location, appOrigin);
      if (loc.origin === appOrigin.origin) {
        response.headers.set("Location", url.origin + prefix + loc.pathname + loc.search);
      }
    }

    // Rewrite cookies so they are scoped to the public domain and prefix.
    const cookies = upstreamResponse.headers.getSetCookie
      ? upstreamResponse.headers.getSetCookie()
      : [];
    if (cookies.length) {
      response.headers.delete("Set-Cookie");
      for (const cookie of cookies) {
        const rewritten = cookie
          .replace(/;\s*Domain=[^;]+/i, "")
          .replace(/;\s*Path=[^;]+/i, `; Path=${prefix}`);
        response.headers.append("Set-Cookie", rewritten);
      }
    }

    return response;
  },
};
