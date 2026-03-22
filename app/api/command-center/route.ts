import { NextResponse } from "next/server";
import { getCommandCenterSnapshot } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getCommandCenterSnapshot();
  return NextResponse.json(snapshot);
}
