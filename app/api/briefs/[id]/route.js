import { NextResponse } from "next/server.js";

import { errorDetails, readJsonRequest, removeBrief, updateBrief } from "../../../../lib/briefs.js";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const input = await readJsonRequest(request);
    return NextResponse.json({ data: await updateBrief(id, input) });
  } catch (error) {
    const details = errorDetails(error);
    return NextResponse.json(details.body, { status: details.status });
  }
}

export async function DELETE(_request, context) {
  try {
    const { id } = await context.params;
    await removeBrief(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const details = errorDetails(error);
    return NextResponse.json(details.body, { status: details.status });
  }
}
