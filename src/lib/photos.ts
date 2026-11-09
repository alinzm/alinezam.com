// Photos are served from Hetzner via baseUrl; absolute or root-relative
// entries (like the placeholders) are used as-is.
export const resolvePhotoSrc = (src: string, baseUrl: string) =>
	src.startsWith('http') || src.startsWith('/') ? src : `${baseUrl}/${src}`;
