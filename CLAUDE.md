# Claude Code Instructions — alinezam.com

## Project
Personal website for Ali Nezam. Static site built with Astro 6, Tailwind CSS v4, deployed to GitHub Pages.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Build static site
- `npm run preview` — Preview built site

## Architecture
- Astro 6 with MDX support
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- Static output to `dist/`
- Blog posts in `src/content/blog/` as Markdown/MDX
- GitHub Pages deployment via GitHub Actions (`.github/workflows/deploy.yml`)

## Domains
- **Primary**: alinezam.com (Cloudflare DNS → GitHub Pages)
- **Redirect**: alinzm.com → alinezam.com (Cloudflare redirect rule)

## Design
- Monochrome black/white/zinc palette
- Inter font (Google Fonts)
- Clean, minimal layout — inspired by steipete.me
- Follow Vercel Web Interface Guidelines for spacing/accessibility

## Photos Section
- `/photos` + project pages follow the "Poster Brut" design (dark #0c0c0c, ivory #f2f0eb, accent #e8542f; Anton/Space Grotesk/Space Mono) — distinct from the main site's light style
- Data: `src/data/photos.json` (projects, photo entries with width/height/alt); shared layout `src/layouts/PhotoLayout.astro`
- Hosting: Hetzner Object Storage, bucket `viraldeck`, prefix `alinezam-photos/`, public base `https://viraldeck.nbg1.your-objectstorage.com/alinezam-photos` (credentials live in ViralDeck's `.env` as `HETZNER_S3_*`)
- Upload photos: `./scripts/upload-photos.sh <folder> <project-slug>` — uploads with public-read ACL and prints manifest JSON to paste into photos.json
- Placeholder SVGs in `public/photos-placeholders/` fill the grids until real photos replace them

## Deployment
- Push to `main` → GitHub Actions builds → GitHub Pages deploys
- Custom domain configured via `public/CNAME`
