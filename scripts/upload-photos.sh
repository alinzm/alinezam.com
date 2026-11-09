#!/usr/bin/env bash
# Upload photos to Hetzner Object Storage and print manifest entries
# for src/data/photos.json.
#
# Usage:
#   ./scripts/upload-photos.sh --init <project-slug>
#   ./scripts/upload-photos.sh <local-folder> <project-slug>
#
# Examples:
#   ./scripts/upload-photos.sh --init berlins-nights
#   ./scripts/upload-photos.sh ~/Pictures/berlin-nights berlins-nights
#
# Credentials are read from HETZNER_S3_ACCESS_KEY_ID / HETZNER_S3_SECRET_ACCESS_KEY,
# falling back to the ViralDeck .env.
set -euo pipefail

ENDPOINT="https://nbg1.your-objectstorage.com"
BUCKET="viraldeck"
PREFIX="alinezam-photos"

if [[ "${1:-}" == "--init" ]]; then
	MODE="init"
	SLUG="${2:?usage: upload-photos.sh --init <project-slug>}"
else
	MODE="upload"
	FOLDER="${1:?usage: upload-photos.sh <local-folder> <project-slug>}"
	SLUG="${2:?usage: upload-photos.sh <local-folder> <project-slug>}"
	[[ -d "$FOLDER" ]] || { echo "Photo folder not found: $FOLDER" >&2; exit 1; }
fi

command -v aws >/dev/null || { echo "The AWS CLI is required. Install it with: brew install awscli" >&2; exit 1; }

if [[ -z "${HETZNER_S3_ACCESS_KEY_ID:-}" ]]; then
	VIRALDECK_ENV="/Users/admin/Projects/ViralDeck/.env"
	HETZNER_S3_ACCESS_KEY_ID=$(grep -h "^HETZNER_S3_ACCESS_KEY_ID" "$VIRALDECK_ENV" /Users/admin/Projects/ViralDeck/apps/*/.env 2>/dev/null | head -1 | cut -d= -f2)
	HETZNER_S3_SECRET_ACCESS_KEY=$(grep -h "^HETZNER_S3_SECRET_ACCESS_KEY" "$VIRALDECK_ENV" /Users/admin/Projects/ViralDeck/apps/*/.env 2>/dev/null | head -1 | cut -d= -f2)
fi
export AWS_ACCESS_KEY_ID="$HETZNER_S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$HETZNER_S3_SECRET_ACCESS_KEY"

if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
	echo "Hetzner S3 credentials were not found. Set HETZNER_S3_ACCESS_KEY_ID and HETZNER_S3_SECRET_ACCESS_KEY." >&2
	exit 1
fi

if [[ "$MODE" == "init" ]]; then
	aws s3api put-object \
		--bucket "$BUCKET" \
		--key "$PREFIX/$SLUG/.keep" \
		--acl public-read \
		--endpoint-url "$ENDPOINT" >/dev/null
	echo "Created s3://$BUCKET/$PREFIX/$SLUG/"
	exit 0
fi

echo "Uploading $FOLDER -> s3://$BUCKET/$PREFIX/$SLUG/" >&2
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
	width=$(sips -g pixelWidth "$file" | awk '/pixelWidth/{print $2}')
	height=$(sips -g pixelHeight "$file" | awk '/pixelHeight/{print $2}')
	aws s3 cp "$file" "s3://$BUCKET/$PREFIX/$SLUG/$name" --acl public-read --endpoint-url "$ENDPOINT" >&2
	MANIFEST+="				{ \"src\": \"$SLUG/$name\", \"width\": $width, \"height\": $height, \"alt\": \"\" },\n"
done

echo >&2
echo "Add to the project's photos array in src/data/photos.json (fill in alt text):" >&2
printf '%b' "${MANIFEST%,\\n}\n"
