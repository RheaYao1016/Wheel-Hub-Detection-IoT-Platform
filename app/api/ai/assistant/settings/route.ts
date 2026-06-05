import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: { enabled: true, defaultProvider: "openai", defaultModel: "gpt-4o-mini", temperature: 0.7 },
  });
}
