import Catalog from '../components/Catalog';

type ShopProps = {
  onQuickView: (slug: string) => void;
  initialCategory?: string;
};

/**
 * Standalone catalog view (#shop). The home page embeds the same component as
 * its "کاتالوگ کامل" chapter, so both share one filtering implementation.
 */
export default function Shop({ onQuickView, initialCategory }: ShopProps) {
  return <Catalog onQuickView={onQuickView} initialCategory={initialCategory ?? null} variant="page" />;
}
