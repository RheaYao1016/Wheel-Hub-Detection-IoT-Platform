"use client";

import { useCallback, useState, type ReactNode } from "react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  siblingCount?: number;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  siblingCount = 1,
}: PaginationProps) {
  const [isJumping, setIsJumping] = useState(false);
  const [jumpInput, setJumpInput] = useState("");

  const createPages = useCallback(() => {
    const pages: (number | string)[] = [];

    if (totalPages <= 1) return pages;

    const firstPage = 1;
    const lastPage = totalPages;

    const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPage);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPage);

    const shouldShowLeftDots = leftSiblingIndex > firstPage + 2;
    const shouldShowRightDots = rightSiblingIndex < lastPage - 1;

    if (!shouldShowLeftDots && !shouldShowRightDots) {
      for (let i = firstPage; i <= lastPage; i++) pages.push(i);
      return pages;
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      pages.push(firstPage);
      if (leftSiblingIndex > firstPage + 1) pages.push("...");
      for (let i = leftSiblingIndex; i <= lastPage; i++) pages.push(i);
      return pages;
    }

    if (!shouldShowLeftDots && shouldShowRightDots) {
      for (let i = firstPage; i <= rightSiblingIndex; i++) pages.push(i);
      if (rightSiblingIndex < lastPage - 1) pages.push("...");
      pages.push(lastPage);
      return pages;
    }

    pages.push(firstPage);
    if (leftSiblingIndex > firstPage + 1) pages.push("...");
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) pages.push(i);
    if (rightSiblingIndex < lastPage - 1) pages.push("...");
    pages.push(lastPage);

    return pages;
  }, [currentPage, totalPages, siblingCount]);

  const handleJump = useCallback(() => {
    const page = parseInt(jumpInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpInput("");
      setIsJumping(false);
    }
  }, [jumpInput, totalPages, onPageChange]);

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span className="pagination-info-text">
          {totalItems > 0
            ? `显示 ${startItem}-${endItem} / 共 ${totalItems} 条`
            : "无数据"}
        </span>
      </div>

      <nav className="pagination-nav" aria-label="分页导航">
        <button
          type="button"
          className="pagination-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="上一页"
        >
          {"<"}
        </button>

        {createPages().map((page, index) =>
          typeof page === "string" ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              {page}
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`pagination-button ${page === currentPage ? "pagination-button-active" : ""}`}
              onClick={() => onPageChange(page)}
              aria-label={`第 ${page} 页`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          className="pagination-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="下一页"
        >
          {">"}
        </button>
      </nav>

      <div className="pagination-controls">
        {onPageSizeChange && (
          <label className="pagination-size-label">
            每页
            <select
              className="pagination-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            条
          </label>
        )}

        <button
          type="button"
          className="pagination-jump-button"
          onClick={() => setIsJumping(!isJumping)}
          aria-label="跳转到指定页"
        >
          跳转
        </button>

        {isJumping && (
          <span className="pagination-jump-input">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJump()}
              placeholder={`1-${totalPages}`}
              className="pagination-jump-field"
              aria-label="页码"
            />
            <button
              type="button"
              className="pagination-jump-confirm"
              onClick={handleJump}
            >
              确定
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

type SkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({
  rows = 5,
  columns = 6,
  className = "",
}: SkeletonProps) {
  return (
    <div className={`table-skeleton ${className}`} aria-label="加载中">
      {/* Header skeleton */}
      <div className="table-skeleton-header">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="table-skeleton-cell table-skeleton-cell-header" />
        ))}
      </div>
      {/* Body skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="table-skeleton-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="table-skeleton-cell">
              <div
                className="table-skeleton-bar"
                style={{
                  width: `${40 + Math.random() * 50}%`,
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state-enhanced" role="status">
      <div className="empty-state-icon">{icon || <span>!</span>}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
