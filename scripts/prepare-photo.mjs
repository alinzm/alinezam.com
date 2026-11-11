#!/usr/bin/env node
// Prepare one photo for the /photos site: a JPEG at most 2400px on the long
// edge (the size the lightbox is designed for).
//
//   - Source already >= 2400px: plain Lanczos downscale.
//   - Smaller source: Gemini upscale with scripts/upscale-prompt.txt, then the
//     prompt's own A/B test: the result is downscaled back to the source size
//     and compared. If it drifted (geometry, tones, invented detail), it is
//     rejected and the photo gets a conservative Lanczos upscale (max 2x).
//
// Usage:
//   node scripts/prepare-photo.mjs <input> <output.jpg> [--trim] [--no-ai]
//
// --trim   remove uniform padding bars (e.g. Instagram letterboxing); leave it
//          off for photos whose edges are genuinely black or white
// --no-ai  skip Gemini and use the conservative upscale directly
//
// Prints one JSON line describing what was done. GEMINI_API_KEY comes from
// the environment, falling back to ViralDeck's .env.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const LONG_EDGE = 2400;
const MAX_SAFE_SCALE = 2;
// A faithful upscale lands well above 30 dB when downscaled back; Gemini's
// re-renders measured ~15 dB in testing.
const MIN_PSNR_DB = 30;
const MAX_ASPECT_DRIFT = 0.005;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
	console.error('usage: prepare-photo.mjs <input> <output.jpg> [--trim] [--no-ai]');
	process.exit(1);
}

let source = await sharp(input).rotate().toBuffer();
if (flags.includes('--trim')) source = await sharp(source).trim({ threshold: 3 }).toBuffer();
const { width: srcW, height: srcH } = await sharp(source).metadata();
const srcLong = Math.max(srcW, srcH);

const sizeFor = (scale) => ({ width: Math.round(srcW * scale), height: Math.round(srcH * scale) });
const result = { input, source: `${srcW}x${srcH}` };
let finalImage;

if (srcLong >= LONG_EDGE) {
	result.method = 'downscale';
	finalImage = sharp(source).resize({ ...sizeFor(LONG_EDGE / srcLong), kernel: 'lanczos3' });
} else {
	const gemini = flags.includes('--no-ai') ? null : await geminiUpscale(source);
	if (gemini) {
		const check = await fidelity(source, gemini);
		Object.assign(result, { geminiPsnrDb: check.psnr, geminiAspectDriftPct: check.drift });
		if (check.psnr >= MIN_PSNR_DB && check.drift / 100 <= MAX_ASPECT_DRIFT) {
			result.method = 'gemini';
			finalImage = sharp(gemini).resize({ ...sizeFor(LONG_EDGE / srcLong), kernel: 'lanczos3' });
		}
	}
	if (!finalImage) {
		result.method = gemini ? 'safe-upscale (gemini rejected)' : 'safe-upscale';
		const scale = Math.min(MAX_SAFE_SCALE, LONG_EDGE / srcLong);
		finalImage = sharp(source).resize({ ...sizeFor(scale), kernel: 'lanczos3' });
	}
}

await mkdir(dirname(output), { recursive: true });
const info = await finalImage.jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(output);
result.output = `${info.width}x${info.height}`;
console.log(JSON.stringify(result));

async function geminiUpscale(image) {
	const prompt = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'upscale-prompt.txt'), 'utf8');
	const jpeg = await sharp(image).jpeg({ quality: 100 }).toBuffer();
	const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'x-goog-api-key': await apiKey() },
		body: JSON.stringify({
			contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }, { text: prompt }] }],
			generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: '4K' } },
		}),
	});
	if (!res.ok) {
		result.geminiError = `${res.status}: ${(await res.text()).slice(0, 200)}`;
		return null;
	}
	const data = await res.json();
	const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
	if (!part) {
		result.geminiError = 'no image returned';
		return null;
	}
	return Buffer.from(part.inlineData.data, 'base64');
}

async function apiKey() {
	if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
	const env = await readFile('/Users/admin/Projects/ViralDeck/.env', 'utf8');
	const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
	if (!key) throw new Error('GEMINI_API_KEY not found');
	return key;
}

// The prompt's final test: downscale the upscale to the source size and compare.
async function fidelity(src, up) {
	const { width, height } = await sharp(up).metadata();
	const drift = Math.abs(width / height - srcW / srcH) / (srcW / srcH);
	const raw = (buf) => sharp(buf).resize(srcW, srcH, { fit: 'fill' }).removeAlpha().raw().toBuffer();
	const [a, b] = await Promise.all([raw(src), raw(up)]);
	let sumSq = 0;
	for (let i = 0; i < a.length; i++) sumSq += (a[i] - b[i]) ** 2;
	const psnr = 10 * Math.log10((255 * 255) / (sumSq / a.length));
	return { psnr: +psnr.toFixed(1), drift: +(drift * 100).toFixed(2) };
}
