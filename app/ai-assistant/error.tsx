"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AiAssistantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const title = "AI Assistant crashed at runtime";
  const description =
    "A client-side exception interrupted this page. Check endpoint config, provider setup, and browser console logs.";
  const retryLabel = "Retry page";
  const backLabel = "Back to workspace";

  useEffect(() => {
    console.error("ai-assistant runtime error", error);
  }, [error]);

  return (
    <div className="enterprise-shell">
      <div className="enterprise-main-card">
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="enterprise-action-row">
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={reset}
          >
            {retryLabel}
          </button>
          <Link href="/workspace" className="enterprise-secondary-button">
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
