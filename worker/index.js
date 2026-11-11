// Static assets are served before this Worker runs, so it only sees paths
// with no built file. Photo files under /photos/<project>/<file> come from
// the R2 bucket; everything else falls through to the assets 404.
const PHOTO_PATH = /^\/photos\/([a-z0-9-]+\/[^/]+\.(?:jpe?g|png|webp|avif))$/i;

export default {
	async fetch(request, env) {
		const match = new URL(request.url).pathname.match(PHOTO_PATH);
		if (!match || !['GET', 'HEAD'].includes(request.method)) {
			return env.ASSETS.fetch(request);
		}

		const object = await env.PHOTOS.get(decodeURIComponent(match[1]), {
			onlyIf: request.headers,
		});
		if (!object) return env.ASSETS.fetch(request);

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set('etag', object.httpEtag);
		headers.set('cache-control', 'public, max-age=31536000, immutable');

		// No body means a conditional request matched the cached copy.
		if (!('body' in object)) return new Response(null, { status: 304, headers });
		return new Response(request.method === 'HEAD' ? null : object.body, { headers });
	},
};
