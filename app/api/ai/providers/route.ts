import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "openai", name: "OpenAI GPT-4o", type: "chat", enabled: true, model: "gpt-4o-mini" },
      { id: "local", name: "本地推理服务", type: "chat", enabled: false, model: "qwen2.5-7b" },
    ],
  });
}
