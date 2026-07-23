import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { GET as getBriefs, POST as postBrief } from "../app/api/briefs/route.js";
import {
  DELETE as deleteBrief,
  PATCH as patchBrief,
} from "../app/api/briefs/[id]/route.js";
import { GET as getHealth } from "../app/api/health/route.js";

function jsonRequest(url, method, body) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("route handlers expose the documented HTTP contract", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sound-brief-api-"));
  process.env.STORAGE_MODE = "file";
  process.env.DATA_FILE = path.join(directory, "briefs.json");

  try {
    const invalidJson = await postBrief(jsonRequest("http://local/api/briefs", "POST", "{"));
    assert.equal(invalidJson.status, 400);
    assert.equal((await invalidJson.json()).error.code, "INVALID_JSON");

    const invalidFields = await postBrief(jsonRequest("http://local/api/briefs", "POST", {
      title: "",
      goal: "x",
      mood: "Neon",
    }));
    assert.equal(invalidFields.status, 400);
    assert.equal((await invalidFields.json()).error.code, "VALIDATION_ERROR");

    const createdResponse = await postBrief(jsonRequest("http://local/api/briefs", "POST", {
      title: "Soft pulse",
      goal: "Support the vocal without masking it.",
      mood: "Warm",
    }));
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).data;

    const listResponse = await getBriefs();
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).data.length, 1);

    const updatedResponse = await patchBrief(
      jsonRequest(`http://local/api/briefs/${created.id}`, "PATCH", { status: "ready" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).data.status, "ready");

    const unknownResponse = await patchBrief(
      jsonRequest("http://local/api/briefs/00000000-0000-4000-8000-000000000000", "PATCH", {
        status: "ready",
      }),
      { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) },
    );
    assert.equal(unknownResponse.status, 404);

    const healthResponse = await getHealth();
    const health = await healthResponse.json();
    assert.equal(healthResponse.status, 200);
    assert.equal(health.ok, true);
    assert.equal(health.records, 1);

    const deletedResponse = await deleteBrief(
      new Request(`http://local/api/briefs/${created.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    assert.equal(deletedResponse.status, 204);
    assert.equal((await (await getBriefs()).json()).data.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
    delete process.env.DATA_FILE;
    delete process.env.STORAGE_MODE;
  }
});
