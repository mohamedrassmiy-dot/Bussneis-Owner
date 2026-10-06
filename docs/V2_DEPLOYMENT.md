# Business Owner V2 — Deployment readiness

V2 is under development on `business-owner-v2`. Do not merge before GitHub Actions validates type checking, tests and production build.

## Admin authentication

Authentication does not need Manus OAuth. Set these Railway service variables in the production environment when V2 is ready:

- `ADMIN_EMAIL`: the owner's admin email
- `ADMIN_PASSWORD_HASH`: `scrypt$<salt hex>$<64-byte derived key hex>`
- `ADMIN_SESSION_SECRET`: a random secret with at least 32 characters
- `DATABASE_URL`: a secure MySQL URL, accessible from Railway

Do not add plaintext passwords, connection strings or secrets to GitHub. Rotate an exposed password.

To generate a scrypt hash, run locally (not in CI) with Node.js 22+:

```bash
read -rsp "New admin password: " ADMIN_PASSWORD; echo
export ADMIN_PASSWORD
node -e 'const {randomBytes,scryptSync}=require("node:crypto");const salt=randomBytes(24);console.log("scrypt$"+salt.toString("hex")+"$"+scryptSync(process.env.ADMIN_PASSWORD,salt,64).toString("hex"))'
unset ADMIN_PASSWORD
```

Generate `ADMIN_SESSION_SECRET` using `node -e 'console.log(require("node:crypto").randomBytes(48).toString("hex"))'`.

## Database migrations

Use MySQL 8 and apply checked-in Drizzle migrations **once** before promoting to production:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```

Back up the database before schema changes. Check logs for errors; a running container is not proof that auth, CMS, forms or database persist correctly.

## Smoke checks before promotion

1. Unauthenticated `/api/trpc/admin.dashboard` cannot return CMS data.
2. Admin login rejects invalid password and rate-limits repeated attempts.
3. Valid admin login allows CMS dashboard; logout invalidates the session cookie.
4. Create, edit, draft and publish an article; confirm it persists across restart.
5. Submit a contact form; confirm exactly one lead is stored.
6. Change a lead's status and verify it persists.
7. Check Arabic RTL mobile/tablet layouts, metadata, canonical tags and robots rules.

GitHub Actions: `.github/workflows/business-owner-v2.yml`.
