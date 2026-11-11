#!/usr/bin/env bash
# Upload photos to the Cloudflare R2 bucket and print manifest entries
# for src/data/photos.json. The site's Worker serves them at
# https://alinezam.com/photos/<project-slug>/<file>.
#
# Usage:
#   ./scripts/upload-photos.sh <local-folder> <project-slug>
#
# Example:
#   ./scripts/upload-photos.sh ~/Pictures/berlin-nights berlins-nights
#
# Uses wrangler's Cloudflare login (`npx wrangler login`).
set -euo pipefail

BUCKET="alinezam-photos"

FOLDER="${1:?usage: upload-photos.sh <local-folder> <project-slug>}"
SLUG="${2:?usage: upload-photos.sh <local-folder> <project-slug>}"
[[ -d "$FOLDER" ]] || { echo "Photo folder not found: $FOLDER" >&2; exit 1; }

echo "Uploading $FOLDER -> r2://$BUCKET/$SLUG/" >&2
echo >&2

MANIFEST=""
shopt -s nullglob nocaseglob
files=("$FOLDER"/*.{jpg,jpeg,png,webp,avif})
if [[ ${#files[@]} -eq 0 ]]; then
	echo "No JPG, JPEG, PNG, WebP, or AVIF files found in: $FOLDER" >&2
	exit 1
fi

for file in "${files[@]}"; do
	name=$(basename "$file")
	ext=$(echo "${name##*.}" | tr '[:upper:]' '[:lower:]')
	case "$ext" in
		jpg|jpeg) type="image/jpeg" ;;
		*) type="image/$ext" ;;
	esac
	width=$(sips -g pixelWidth "$file" | awk '/pixelWidth/{print $2}')
	height=$(sips -g pixelHeight "$file" | awk '/pixelHeight/{print $2}')
	npx wrangler r2 object put "$BUCKET/$SLUG/$name" --file "$file" --content-type "$type" --remote >&2
	MANIFEST+="				{ \"src\": \"$SLUG/$name\", \"width\": $width, \"height\": $height, \"alt\": \"\" },\n"
done

echo >&2
echo "Add to the project's photos array in src/data/photos.json (fill in alt text):" >&2
printf '%b' "${MANIFEST%,\\n}\n"
