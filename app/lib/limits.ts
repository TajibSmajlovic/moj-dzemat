const MB = 1024 * 1024;

// Hard cap on a single HTTP request body. Enforced in Express.
export const MAX_REQUEST_BYTES = 20 * MB;

// Largest multipart upload we'll hand to the form parser.
export const MAX_UPLOAD_BYTES = 15 * MB;

// We want to allow images that are close to the 15MB upload limit, but we also need to be mindful of the fact that resizing can temporarily require up to 3x the raw bytes of the original image (source + resized output + overhead). In practice we've seen some images briefly consume up to ~25MB of memory during processing, so we set a hard limit that's somewhat above that to avoid OOM crashes while still allowing uploads close to the 15MB limit.
export const MAX_IMAGE_RAW_BYTES = 15 * MB;

// Max edge length (px) after resize. Aspect ratio is preserved.
export const MAX_IMAGE_DIMENSION = 2000;

// WebP quality used by the image pipeline.
export const IMAGE_OUTPUT_QUALITY = 80;
