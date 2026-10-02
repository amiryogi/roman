const MARKER = 0xff;
const SOI = 0xd8;
const SOS = 0xda;
const APP1 = 0xe1; // Exif (camera, date, GPS) and XMP

/**
 * Removes Exif/XMP (APP1) segments from a JPEG, so camera details and GPS coordinates are not
 * uploaded with the original. Cloudinary strips metadata from transformed images, but the
 * untransformed original stays reachable by URL. Other segments (including the colour profile)
 * are kept. Returns the input unchanged if it isn't a well-formed JPEG.
 */
export function stripJpegMetadata(input: Buffer): Buffer {
  if (input[0] !== MARKER || input[1] !== SOI) return input;

  const kept: Buffer[] = [input.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= input.length) {
    if (input[offset] !== MARKER) return input;
    const marker = input[offset + 1];
    // Start of scan: the compressed image data follows; keep everything from here.
    if (marker === SOS) {
      kept.push(input.subarray(offset));
      return Buffer.concat(kept);
    }
    const length = input.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (length < 2 || end > input.length) return input;
    if (marker !== APP1) kept.push(input.subarray(offset, end));
    offset = end;
  }
  return input;
}
