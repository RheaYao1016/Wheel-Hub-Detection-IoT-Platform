import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAdminSnapshot();
  return NextResponse.json(snapshot);
}
