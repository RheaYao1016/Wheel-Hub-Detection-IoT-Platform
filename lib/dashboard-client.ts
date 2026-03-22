/**
 * Resolve dashboard data from the standalone Spring Boot backend first,
 * then gracefully fall back to the local Next.js API during frontend-only demos.
 */
export function getBackendApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080/api";
}

export async function fetchPlatformData<T>(backendPath: string, fallbackPath: string): Promise<T> {
  const backendBase = getBackendApiBase();
  const fallbackBase = "";
  const targets = [`${backendBase}${backendPath}`, `${fallbackBase}${fallbackPath}`];

  let lastError: unknown;

  for (const target of targets) {
    try {
      const response = await fetch(target, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to load platform data");
}

export async function requestPlatformJson<T>(backendPath: string, fallbackPath: string, init?: RequestInit): Promise<T> {
  const backendBase = getBackendApiBase();
  const targets = [`${backendBase}${backendPath}`, fallbackPath].filter(Boolean);
  let lastError: unknown;

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        cache: "no-store",
        ...init,
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to request platform json");
}

export async function requestPlatformBlob(backendPath: string, fallbackPath: string, init?: RequestInit): Promise<Blob> {
  const backendBase = getBackendApiBase();
  const targets = [`${backendBase}${backendPath}`, fallbackPath].filter(Boolean);
  let lastError: unknown;

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        cache: "no-store",
        ...init,
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to request platform blob");
}
