import { NextResponse } from "next/server.js";

import { currentStorageMode, listRecords } from "../../../lib/briefs-store.js";

export const dynamic = "force-dynamic";

export async function GET() {
  let storage = "unknown";
  try {
    storage = currentStorageMode();
    const records = await listRecords();
    return NextResponse.json({
      ok: true,
      service: "sound-brief-board",
      storage,
      records: records.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Storage health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        service: "sound-brief-board",
        storage,
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "The storage service is not available.",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
