// Photos are served from R2 via baseUrl; absolute or root-relative
// entries (like the placeholders) are used as-is. `npm run dev:photos`
// previews the local, not-yet-uploaded files in photos-work/site instead.
const localBase = import.meta.env.DEV && import.meta.env.PUBLIC_PHOTOS_LOCAL
	? `/@fs${new URL('../../photos-work/site', import.meta.url).pathname}`
	: null;

export const resolvePhotoSrc = (src: string, baseUrl: string) =>
	src.startsWith('http') || src.startsWith('/') ? src : `${localBase ?? baseUrl}/${src}`;
