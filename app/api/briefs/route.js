import { NextResponse } from "next/server.js";

import { createBrief, errorDetails, getBriefs, readJsonRequest } from "../../../lib/briefs.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      { data: await getBriefs() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const details = errorDetails(error);
    return NextResponse.json(details.body, { status: details.status });
  }
}

export async function POST(request) {
  try {
    const input = await readJsonRequest(request);
    return NextResponse.json({ data: await createBrief(input) }, { status: 201 });
  } catch (error) {
    const details = errorDetails(error);
    return NextResponse.json(details.body, { status: details.status });
  }
}
