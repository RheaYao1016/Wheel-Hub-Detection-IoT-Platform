import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: {
      indexWindowDays: 183,
      defaultProviderId: "openai",
      defaultPromptPresetId: "preset-001",
      maxTokensPerMessage: 4096,
      temperature: 0.7,
      enableAutoIndex: true,
      enableActionButtons: true,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    data: {
      indexWindowDays: body.indexWindowDays ?? 183,
      defaultProviderId: body.defaultProviderId ?? "openai",
      defaultPromptPresetId: body.defaultPromptPresetId ?? "preset-001",
      maxTokensPerMessage: 4096,
      temperature: 0.7,
      enableAutoIndex: true,
      enableActionButtons: true,
    },
  });
}
