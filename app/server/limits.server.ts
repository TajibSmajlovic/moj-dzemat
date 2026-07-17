const MB = 1024 * 1024;

// Hard cap on a single HTTP request body. Enforced in Express.
export const MAX_REQUEST_BYTES = 20 * MB;

// Largest individual file we'll accept from the multipart parser.
export const MAX_UPLOAD_BYTES = 15 * MB;

// Defense-in-depth check before Sharp processes an uploaded image.
export const MAX_IMAGE_RAW_BYTES = 15 * MB;

// Max edge length (px) after resize. Aspect ratio is preserved.
export const MAX_IMAGE_DIMENSION = 2000;

// WebP quality used by the image pipeline.
export const IMAGE_OUTPUT_QUALITY = 80;
