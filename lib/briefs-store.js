import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, list, put } from "@vercel/blob";

const blobPrefix = "mission-7/briefs/";
const allowedStorageModes = new Set(["file", "blob"]);
let fileMutationQueue = Promise.resolve();

export function currentStorageMode() {
  const mode = process.env.STORAGE_MODE ?? (process.env.VERCEL === "1" ? "blob" : "file");
  if (!allowedStorageModes.has(mode)) {
    throw new Error(`Unsupported STORAGE_MODE: ${mode}. Use file or blob.`);
  }
  return mode;
}

function dataFilePath() {
  const configured = process.env.DATA_FILE;
  if (!configured) return path.join(process.cwd(), "data", "briefs.json");
  return path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

async function readFileRecords() {
  const file = dataFilePath();
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeFileRecords(records) {
  const file = dataFilePath();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

function mutateFile(action) {
  const result = fileMutationQueue.then(action, action);
  fileMutationQueue = result.catch(() => undefined);
  return result;
}

async function listAllBlobs(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function readBlobRecords() {
  const blobs = await listAllBlobs(blobPrefix);
  const versions = await Promise.all(
    blobs
      .filter((blob) => blob.pathname.endsWith(".json"))
      .map(async (blob) => {
        const url = new URL(blob.url);
        url.searchParams.set("version", blob.etag ?? String(blob.uploadedAt ?? "latest"));
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not read ${blob.pathname}.`);
        return {
          brief: await response.json(),
          pathname: blob.pathname,
          uploadedAt: new Date(blob.uploadedAt).getTime(),
        };
      }),
  );

  const latestById = new Map();
  for (const version of versions) {
    const current = latestById.get(version.brief.id);
    const isNewer = !current
      || current.uploadedAt < version.uploadedAt
      || (current.uploadedAt === version.uploadedAt && current.pathname < version.pathname);
    if (isNewer) latestById.set(version.brief.id, version);
  }
  return [...latestById.values()].map((version) => version.brief);
}

async function writeBlobRecord(brief) {
  const version = `${Date.now()}-${randomUUID()}`;
  await put(`${blobPrefix}${brief.id}/${version}.json`, JSON.stringify(brief), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function listRecords() {
  return currentStorageMode() === "blob" ? readBlobRecords() : readFileRecords();
}

export async function insertRecord(brief) {
  if (currentStorageMode() === "blob") {
    await writeBlobRecord(brief);
    return brief;
  }
  return mutateFile(async () => {
    const records = await readFileRecords();
    records.push(brief);
    await writeFileRecords(records);
    return brief;
  });
}

export async function replaceRecord(brief) {
  if (currentStorageMode() === "blob") {
    await writeBlobRecord(brief);
    return brief;
  }
  return mutateFile(async () => {
    const records = await readFileRecords();
    const index = records.findIndex((record) => record.id === brief.id);
    if (index === -1) return null;
    records[index] = brief;
    await writeFileRecords(records);
    return brief;
  });
}

export async function deleteRecord(id) {
  if (currentStorageMode() === "blob") {
    const blobs = await listAllBlobs(`${blobPrefix}${id}/`);
    if (blobs.length === 0) return false;
    await del(blobs.map((blob) => blob.url));
    return true;
  }
  return mutateFile(async () => {
    const records = await readFileRecords();
    const next = records.filter((record) => record.id !== id);
    if (next.length === records.length) return false;
    await writeFileRecords(next);
    return true;
  });
}
