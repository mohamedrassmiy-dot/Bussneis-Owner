# Business Owner — Professional CMS V3

## Scope
Bilingual Arabic/English content management, protected `/Admin`, pages, articles, image management, embeds, per-item SEO, Google Search Console verification, configurable sections and contact leads.

## Implemented on the V2 staging branch (NOT live)
- MySQL tables `cms_pages`, `cms_posts`, `cms_settings`, migration `0002_cms_v3.sql`.
- Protected CRUD tRPC routes, bilingual locales, draft/publish status, per-item SEO title, description, robots, canonical, Open Graph and JSON-LD.
- Section builder types: hero, text, image, embed, CTA and FAQ.
- Dedicated admin interface for pages, posts, sections, settings and lead status, backed by database APIs rather than fake metrics.
- Public bilingual CMS page and article renderers and safe embed URL allowlist.
- Existing Arabic homepage, services, articles and about page can be overridden with CMS pages using matching slugs.
- Google Search Console HTML verification endpoint (exact filename + content match from database).
- Contact lead form uses database persistence and does not report success if storage fails.

## Critical release blockers — DO NOT MERGE OR DEPLOY YET
1. **Database**: Railway project currently has no MySQL service and no DATABASE_URL. Provision a persistent MySQL instance, link `DATABASE_URL` and run migrations before enabling the CMS.
2. **CI/QA**: Run `pnpm check`, `pnpm test`, `pnpm build` and end-to-end browser tests against a separate staging environment. PR #1 is currently not mergeable; reconcile with latest main.
3. **Image uploads**: Admin currently accepts HTTPS image URLs and previews them. Real file uploads require an S3-compatible bucket, server-side signed upload flow, image validation, size limits, and storage lifecycle policy.
4. **Existing pages**: Homepage, services, articles and about support CMS overrides, but the contact form and all individual legacy service/article routes still need full migration to editable CMS content. Existing content must be imported without changing URLs.
5. **Global settings**: Settings are stored; only GSC HTML verification endpoint is served. Google meta verification, editable robots.txt, global SEO defaults, and safe head/footer embeds need runtime wiring and tests. Never execute arbitrary HTML/JS from untrusted users.
6. **Bilingual navigation**: English site is available, but its hardcoded content must be replaced with CMS-driven pages and posts.
7. **Security**: Rotate the admin password previously exposed in chat. Test login rate limits, session security, CSRF protections, role gates and content sanitization.
8. **SEO**: Generate dynamic sitemap.xml with canonical URLs and hreflang for all published pages and articles, and test index/noindex and structured data.
9. **Database operations**: Add backups, migration rollback plan, monitoring and retention policy for lead PII.
10. **Media and embed safety**: Restrict image origins/size, block javascript: and untrusted iframe hosts, enforce CSP frame-src.

## Release rule
Do not call this a complete professional CMS until all blockers are addressed and the deployed site is tested. Do not merge this branch into main solely because a GitHub commit succeeded.
