export function getImagePath(relativePath: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${basePath}${cleanPath}`;
}
