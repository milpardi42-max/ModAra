import { asset } from './format';

/**
 * The image pipeline (`scripts/optimize-images.mjs`) writes a WebP rendition
 * next to every source image:
 *   <name>-640.webp    – cards, thumbnails, mobile
 *   <name>-1280.webp   – hero, gallery, desktop
 *   <name>-detail.webp – tight crop used as the gallery "detail shot"
 *
 * These helpers turn a plain source path ("/images/bag/tote.jpg") into the
 * srcset/src values consumed by <ResponsiveImage>.
 */
const VARIANT_RE = /\.(jpe?g|png)$/i;

function stripExt(src: string): string | null {
  const resolved = asset(src);
  return VARIANT_RE.test(resolved) ? resolved.replace(VARIANT_RE, '') : null;
}

/** WebP candidates for the `<source>` element. Undefined for non-bitmap paths. */
export function webpSrcSet(src: string | null | undefined): string | undefined {
  const base = src ? stripExt(src) : null;
  return base ? `${base}-640.webp 640w, ${base}-1280.webp 1280w` : undefined;
}

/** The cropped "detail shot" of a product photo. */
export function detailImage(src: string | null | undefined): string | undefined {
  const base = src ? stripExt(src) : null;
  return base ? `${base}-detail.webp` : undefined;
}
