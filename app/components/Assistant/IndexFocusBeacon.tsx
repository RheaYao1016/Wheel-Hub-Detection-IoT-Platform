"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function IndexFocusBeacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  const focusIndex = searchParams.get("ai_index") ?? "";
  const focusLabel = searchParams.get("ai_label") ?? "";

  const message = useMemo(() => {
    if (!focusIndex) {
      return "";
    }
    if (focusLabel) {
      return `已定位到 ${focusLabel}`;
    }
    return `已定位到索引 ${focusIndex}`;
  }, [focusIndex, focusLabel]);

  useEffect(() => {
    const appMain = document.querySelector(".app-main");
    if (!appMain || !focusIndex) {
      document.body.removeAttribute("data-ai-focus-index");
      setVisible(false);
      return;
    }

    document.body.dataset.aiFocusIndex = focusIndex;
    appMain.classList.remove("ai-focus-pulse");
    void (appMain as HTMLElement).offsetWidth;
    appMain.classList.add("ai-focus-pulse");
    setVisible(true);

    const timer = window.setTimeout(() => {
      appMain.classList.remove("ai-focus-pulse");
      document.body.removeAttribute("data-ai-focus-index");
      setVisible(false);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
      appMain.classList.remove("ai-focus-pulse");
      document.body.removeAttribute("data-ai-focus-index");
    };
  }, [focusIndex, pathname]);

  if (!visible || !message) {
    return null;
  }

  return (
    <div className="index-focus-beacon" aria-live="polite">
      <span className="index-focus-beacon-kicker">AI 定位</span>
      <strong>{message}</strong>
      <span>{pathname}</span>
    </div>
  );
}
