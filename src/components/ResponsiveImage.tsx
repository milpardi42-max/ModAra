import { webpSrcSet } from '../lib/media';
import { asset } from '../lib/format';

type ResponsiveImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Responsive hint, e.g. "(max-width: 640px) 45vw, 300px". */
  sizes?: string;
  className?: string;
  /** Above-the-fold images (hero, first row) should load eagerly. */
  eager?: boolean;
  wrapperClassName?: string;
};

/**
 * Every bitmap on the storefront goes through this component so that
 * WebP + srcset + lazy loading are applied consistently. Browsers without
 * WebP fall back to the original JPEG through the <img> element.
 */
export default function ResponsiveImage({
  src,
  alt,
  sizes = '(max-width: 640px) 50vw, 300px',
  className = '',
  eager = false,
  wrapperClassName = '',
}: ResponsiveImageProps) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-dark-50 ${wrapperClassName}`} aria-hidden="true">
        <span className="text-xs text-dark-300">بدون تصویر</span>
      </div>
    );
  }

  const srcSet = webpSrcSet(src);

  return (
    <picture className={wrapperClassName}>
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <img
        src={asset(src)}
        alt={alt}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        {...(eager ? { fetchpriority: 'high' } : {})}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
