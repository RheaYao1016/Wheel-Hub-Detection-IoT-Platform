import { NextResponse } from "next/server";
import { getDigitalTwinSnapshot } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getDigitalTwinSnapshot();
  return NextResponse.json(snapshot);
}
