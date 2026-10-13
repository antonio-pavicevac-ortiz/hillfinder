# Hillfinder

A progressive web app to find downhills based on your current location — and eventually crowdsource them!  
Built with [Next.js](https://nextjs.org), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com).

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Environments and data isolation

Production data is only reachable from the Production deployment. Local development and
Vercel Preview deployments use separate resources, and the app refuses to start a database
or upload connection to production resources outside Production
(`src/lib/env/resourceIsolation.ts`).

| Variable | Production | Preview + local dev |
| --- | --- | --- |
| `MONGODB_URI` | production Atlas user, database `hillfinder` | dev Atlas user limited to database `hillfinder-dev` |
| `UPLOADTHING_TOKEN` | production UploadThing app | separate dev UploadThing app |
| `NEXTAUTH_SECRET` | production secret | a different secret, so dev/preview sessions are never valid in production |

Never copy production user data into the development database. It starts empty, and
Mongoose creates its collections and indexes on first use.

For local development, put the dev values in `.env.local`.
