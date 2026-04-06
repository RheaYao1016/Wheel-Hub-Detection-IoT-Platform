"use client";

import { useSessionGuard } from "@/app/hooks/useSessionGuard";

export const useAdminGuard = () => useSessionGuard(["admin"]);
