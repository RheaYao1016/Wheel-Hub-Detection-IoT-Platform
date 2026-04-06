"use client";

type Labels = {
  total: string;
  items: string;
  expand: string;
  collapse: string;
  prev: string;
  next: string;
};

export function getPageCount(length: number, pageSize: number) {
  return Math.max(1, Math.ceil(length / pageSize));
}

export function getPagedItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = getPageCount(items.length, pageSize);
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  return {
    pageCount,
    safePage,
    items: items.slice(start, start + pageSize),
  };
}

export default function PagedBlockControls({
  count,
  page,
  pageCount,
  expanded,
  onPrev,
  onNext,
  onToggle,
  labels,
}: {
  count: number;
  page: number;
  pageCount: number;
  expanded: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  labels: Labels;
}) {
  return (
    <div className="enterprise-grid-toolbar">
      <span className="enterprise-grid-count">
        {labels.total} {count} {labels.items}
      </span>
      <div className="enterprise-grid-actions">
        <button type="button" className="enterprise-secondary-button enterprise-mini-button" onClick={onToggle}>
          {expanded ? labels.collapse : labels.expand}
        </button>
        <button type="button" className="enterprise-secondary-button enterprise-mini-button" disabled={page <= 0} onClick={onPrev}>
          {labels.prev}
        </button>
        <span className="enterprise-page-indicator">
          {page + 1} / {pageCount}
        </span>
        <button type="button" className="enterprise-secondary-button enterprise-mini-button" disabled={page >= pageCount - 1} onClick={onNext}>
          {labels.next}
        </button>
      </div>
    </div>
  );
}
