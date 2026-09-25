import { ChevronLeft, Home } from 'lucide-react';

type BreadcrumbItem = {
  label: string;
  view?: string;
  param?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  onNavigate: (view: string, param?: string) => void;
};

export default function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav aria-label="مسیر صفحه" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-dark-500">
      <button type="button" onClick={() => onNavigate('home')} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-amber-50 hover:text-amber-700">
        <Home className="h-3.5 w-3.5" />
        خانه
      </button>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          <ChevronLeft className="h-4 w-4 text-dark-300" aria-hidden="true" />
          {item.view ? (
            <button type="button" onClick={() => onNavigate(item.view!, item.param)} className="rounded-lg px-1.5 py-1 transition-colors hover:bg-amber-50 hover:text-amber-700">
              {item.label}
            </button>
          ) : (
            <span className="max-w-[min(72vw,28rem)] truncate font-medium text-dark-900" aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
