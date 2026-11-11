# Claude Code Instructions — alinezam.com

## Project
Personal website for Ali Nezam. Static site built with Astro 6, Tailwind CSS v4, deployed as a Cloudflare Worker (static assets).

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Build static site
- `npm run preview` — Preview built site

## Architecture
- Astro 6 with MDX support
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- Static output to `dist/`
- Blog posts in `src/content/blog/` as Markdown/MDX
- Cloudflare Worker deploy (`wrangler.jsonc`); `.github/workflows/pr.yml` only builds PRs

## Domains
- **Primary**: alinezam.com (Cloudflare DNS → Worker `alinezam-com`)
- **Redirect**: alinzm.com → alinezam.com (Cloudflare redirect rule)

## Design
- Monochrome black/white/zinc palette
- Inter font (Google Fonts)
- Clean, minimal layout — inspired by steipete.me
- Follow Vercel Web Interface Guidelines for spacing/accessibility

## Photos Section
- `/photos` + project pages follow the "Poster Brut" design (dark #0c0c0c, ivory #f2f0eb, accent #e8542f; Anton/Space Grotesk/Space Mono) — distinct from the main site's light style
- Data: `src/data/photos.json` (projects, photo entries with width/height/alt); shared layout `src/layouts/PhotoLayout.astro`
- Hosting: Cloudflare R2 bucket `alinezam-photos` (private), bound to the `alinezam-com` Worker as `PHOTOS`. `worker/index.js` serves `/photos/<project>/<file>` from R2; everything else is static assets
- Adding photos: use the `photo-portfolio` skill (`.claude/skills/photo-portfolio/SKILL.md`) — select → `scripts/prepare-photo.mjs` → `npm run dev:photos` preview → `scripts/upload-photos.sh` → deploy

## Deployment
- Cloudflare Worker `alinezam-com` (`wrangler.jsonc`): `npm run build && npx wrangler deploy`
