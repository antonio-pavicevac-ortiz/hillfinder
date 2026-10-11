# Mobile preview with ngrok

Stop the current server on port 3000 and run:

```sh
npm run dev:ngrok
```

The launcher uses your ngrok account's assigned development domain on its first
run, saves the detected origin in ignored `.env.ngrok`, and explicitly requests
that same URL on later runs. Next.js starts with the public address as
`NEXTAUTH_URL`; `.env.local` remains unchanged.

Register the printed callback URL in your Google OAuth web client's
**Authorized redirect URIs** once. Then use the printed preview URL on your
phone. Future starts reuse the same domain, so you do not need to register a new
callback each time. The server and tunnel must be running for the URL to work.

If ngrok is not authenticated, follow its account setup to configure an
authtoken locally. Do not commit or paste the token into the handoff file.
To choose a different domain that belongs to your account, launch with:

```sh
NGROK_URL=https://your-assigned-domain.ngrok-free.app npm run dev:ngrok
```

Press Ctrl+C to stop both processes. Free ngrok endpoints may show a "Visit Site"
confirmation before the app. A valid ngrok configuration was found on this Mac;
a live ngrok session has not been verified by the automated tests.

```sh
node --test scripts/dev-cloudflare.test.mjs scripts/dev-ngrok.test.mjs
```

# Alternative: Mobile preview with Cloudflare

Stop any existing server on port 3000, then run from the project directory:

```sh
npm run dev:cloudflare
```

The launcher starts a temporary Cloudflare tunnel, captures the public HTTPS
address, and starts Next.js on port 3000 with that address as `NEXTAUTH_URL`.
`NEXTAUTH_URL_INTERNAL` remains `http://localhost:3000`. Your existing
`.env.local` is unchanged, and `npm run dev` still uses its usual settings.

The terminal prints the phone preview address and the exact Google callback
URL. Add that callback URL to **Authorized redirect URIs** for your existing
Google OAuth web client in Google Cloud Console, save it, and then sign in from
the printed preview address. Each new temporary tunnel requires registering
its new callback URL. The launcher cannot change your Google OAuth settings.

The generated `.env.tunnel` file records the current session's address and is
ignored by Git through the existing `.env*` rule. It is not automatically loaded
or reused: that address stops working when the tunnel stops. Press Ctrl+C to
stop both Cloudflare and Next.js. The launcher leaves `.next` intact.

Requires `cloudflared` on your PATH. This launcher uses Cloudflare, not ngrok.
Hydration warnings are a separate issue from the callback URL configuration.

Run the launcher tests without opening a public tunnel:

```sh
node --test scripts/dev-cloudflare.test.mjs
```
