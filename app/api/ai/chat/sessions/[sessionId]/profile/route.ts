import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  // Mock: acknowledge profile update
  return NextResponse.json({
    data: {
      id: sessionId,
      title: `会话 ${sessionId}`,
      persona: "operator",
      locale: "zh-CN",
      promptPresetId: "preset-001",
      sourceIds: ["ds-001"],
      updatedAt: new Date().toISOString(),
    },
  });
}
