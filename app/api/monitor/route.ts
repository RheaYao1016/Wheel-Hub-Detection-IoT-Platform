import { NextResponse } from "next/server";
import { getMonitorSnapshot } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getMonitorSnapshot();
  return NextResponse.json(snapshot);
}
