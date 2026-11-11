---
name: photo-portfolio
description: Add photos to the alinezam.com/photos portfolio end to end — critique and select them with a strict professional bar, prepare them (Gemini upscale with a fidelity gate, or resize), preview locally, upload to Cloudflare R2, and deploy. Use when the user hands over a folder of photos, Instagram posts, or image files for the photo site, or asks to add, replace, or remove portfolio photos.
---

# Photo portfolio

Pipeline for `/photos` (Poster Brut design; see the Photos Section in CLAUDE.md). Data lives in `src/data/photos.json`; files are served from the private R2 bucket `alinezam-photos` by `worker/index.js` at `https://alinezam.com/photos/<project-slug>/<file>`.

Work in `photos-work/` (gitignored): `original/` for sources, `site/<project-slug>/` for prepared files that mirror R2.

## 1. Collect the sources

- **Local folder**: list the images (JPG/PNG/HEIC/TIFF). Prefer camera originals over exports.
- **Instagram**: the user's accounts are `@schwarzandwhite` (B&W street), `@alinzm.jpg` (color film), `@alinzm` (personal). Use Claude in Chrome (they're signed in there). Chrome blocks repeated automatic downloads, so collect each post's on-screen image URL into `localStorage`, then fetch them all on one page and save a single `.tar` (one download). For carousels, take the image at the slide's on-screen position (`document.elementsFromPoint`), not the largest `<img>`: neighbouring slides are preloaded. Instagram copies are only 640–1440px.

## 2. Critique and select (strict)

Act as a professional photo critic. The bar is "looks fully professional"; when in doubt, cut. No "extras" or "maybe" tiers, and thin projects beat diluted ones. Judge composition, light, timing/moment, tonal control, and fit with the project:

| Project | Fit |
|---|---|
| `berlins-nights` | B&W, night, Berlin |
| `streets` | B&W street, Berlin and beyond |
| `potatoes-and-more` | Color, humor |

- Cut postcard views, sunsets and landmarks, heavy Instagram filters, and anything too small to hold full-screen (under ~1000px real content after trimming is a red flag).
- Humor must not punch down (e.g. poverty is not the joke).
- Flag identifiable strangers in sensitive situations (German image rights); the user decides.
- Look at each candidate at full size before final calls; thumbnails mislead (I once called an awake man "asleep").
- A new project, or a change to project titles/meta, is the user's call; propose it, don't do it.

Present one ranked list per project, with a one-line reason for each and what you cut, and **wait for the user's approval** before preparing files.

## 3. Prepare the files

For each approved photo, in display order:

```bash
node scripts/prepare-photo.mjs <source> photos-work/site/<slug>/<NN>-<short-name>.jpg [--trim] [--no-ai]
```

- Sources ≥ 2400px are downscaled to 2400px on the long edge.
- Smaller sources are sent to Gemini (`gemini-3-pro-image`, prompt in `scripts/upscale-prompt.txt`), then checked with the prompt's own A/B test: downscaled back to the source size, the result must reach ≥ 30 dB PSNR with < 0.5% aspect drift. Otherwise it is rejected and the photo gets a conservative Lanczos upscale (max 2×). In testing, Gemini re-rendered photos (≈15 dB, shifted framing, invented detail) and was always rejected; report honestly which method each photo got. Each Gemini call costs roughly $0.25.
- Use `--trim` only for padded posts (Instagram letterboxing). It removes only perfectly flat borders, but check night photos by eye.
- Report each photo's final size. Anything that ends up soft or under ~1600px on the long edge goes back to the user as at risk under the strict bar.

**File names are permanent.** R2 objects are served with `cache-control: immutable` for a year, so never re-upload different content under an existing name: use a new name (e.g. `01-kudamm-v2.jpg`).

## 4. Update photos.json and preview

- Add `{ "src": "<slug>/<file>", "width", "height", "alt" }` per photo, in display order. The first photo of each project is its cover on `/photos`.
- Alt text describes what is literally in the frame, in one sentence, without guessing places or identities.
- Keep each project's `meta` accurate (e.g. the year range of its photos).
- Preview with the `photos-preview` launch config (`npm run dev:photos`, which serves `photos-work/site/` locally). Check every project page and the lightbox in the browser pane, confirm every image loads, and show the user.

## 5. Upload and deploy (after the user's go-ahead)

```bash
./scripts/upload-photos.sh photos-work/site/<slug> <slug>   # once per project
npm run build && npx wrangler deploy
```

- Confirm the manifest printed by the upload script matches `photos.json` (width/height).
- Verify live: every `/photos/...` page returns 200, and every image URL on it returns 200 with `image/jpeg`.
- Removing a photo: delete it from `photos.json` and deploy; delete the object with `npx wrangler r2 object delete alinezam-photos/<slug>/<file> --remote` only when the user asks.

## 6. Commit

Commit `photos.json` and any code changes on the current branch (never the photo files; they live in R2). Push or merge only when the user asks.
