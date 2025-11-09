"use client";

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function ExportButton({ onClick, disabled = false, label = "导出", className = "" }: ExportButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`export-button ${className}`}>
      <span aria-hidden className="text-base leading-none text-[var(--accent)]">⇢</span>
      {label}
    </button>
  );
}
