/**
 * Resolve dashboard data from the standalone Spring Boot backend first,
 * then gracefully fall back to the local Next.js API during frontend-only demos.
 */
export async function fetchPlatformData<T>(backendPath: string, fallbackPath: string): Promise<T> {
  const backendBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080/api";
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
