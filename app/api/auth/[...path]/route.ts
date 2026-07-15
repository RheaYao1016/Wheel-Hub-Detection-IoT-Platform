import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BACKEND_BASE =
  (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:18081").replace(
    /\/$/,
    "",
  );

function buildTargetUrl(pathSegments: string[], search: string) {
  const safePath = pathSegments
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${BACKEND_BASE}/api/auth/${safePath}${search}`;
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "host" || lowerKey === "content-length") {
      continue;
    }
    headers.set(key, value);
  }

  return headers;
}

function copyResponseHeaders(response: Response) {
  const headers = new Headers();

  for (const [key, value] of response.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "content-length" ||
      lowerKey === "content-encoding" ||
      lowerKey === "transfer-encoding" ||
      lowerKey === "connection"
    ) {
      continue;
    }
    headers.set(key, value);
  }

  return headers;
}

async function forwardAuthRequest(request: NextRequest, method: "GET" | "POST") {
  const path = request.nextUrl.pathname.split("/").slice(4);
  const target = buildTargetUrl(path, request.nextUrl.search);
  const headers = copyRequestHeaders(request);

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET") {
    init.body = await request.text();
  }

  const response = await fetch(target, init);
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers: copyResponseHeaders(response),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return forwardAuthRequest(request, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return forwardAuthRequest(request, "POST");
}
