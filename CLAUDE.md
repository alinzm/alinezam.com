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

## Deployment
- Push to `main` → GitHub Actions builds → GitHub Pages deploys
- Custom domain configured via `public/CNAME`
