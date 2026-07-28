import { NextResponse } from "next/server"
import { tryCreateTakeoutExport } from "@/lib/gpay-takeout-client"

export async function GET() {
  const result = await tryCreateTakeoutExport()
  return NextResponse.json(result)
}
