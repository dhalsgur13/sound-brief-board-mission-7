import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BriefError,
  createBrief,
  getBriefs,
  parseCreateBrief,
  removeBrief,
  updateBrief,
} from "../lib/briefs.js";

test("validates create input with readable field errors", () => {
  assert.throws(
    () => parseCreateBrief({ title: "", goal: "x", mood: "Neon" }),
    (error) => Boolean(
      error instanceof BriefError
      && error.status === 400
      && error.fields.title
      && error.fields.goal
      && error.fields.mood,
    ),
  );
});

test("creates, lists, updates, and deletes a brief in file storage", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sound-brief-board-"));
  process.env.STORAGE_MODE = "file";
  process.env.DATA_FILE = path.join(directory, "briefs.json");

  try {
    const created = await createBrief({
      title: "Warm bass",
      goal: "Leave space for the vocal",
      mood: "Warm",
    });
    assert.equal(created.status, "draft");
    assert.equal((await getBriefs()).length, 1);

    const updated = await updateBrief(created.id, { status: "ready" });
    assert.equal(updated.status, "ready");
    assert.equal((await getBriefs())[0].status, "ready");

    await removeBrief(created.id);
    assert.deepEqual(await getBriefs(), []);
    assert.deepEqual(JSON.parse(await readFile(process.env.DATA_FILE, "utf8")), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
    delete process.env.DATA_FILE;
    delete process.env.STORAGE_MODE;
  }
});

test("returns not found for an unknown brief", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sound-brief-board-"));
  process.env.STORAGE_MODE = "file";
  process.env.DATA_FILE = path.join(directory, "briefs.json");

  try {
    await assert.rejects(
      () => updateBrief("00000000-0000-4000-8000-000000000000", { status: "ready" }),
      (error) => error instanceof BriefError && error.status === 404,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
    delete process.env.DATA_FILE;
    delete process.env.STORAGE_MODE;
  }
});
