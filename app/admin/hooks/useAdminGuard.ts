"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const useAdminGuard = () => {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("role");
    if (stored === "admin") {
      setReady(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  return ready;
};
