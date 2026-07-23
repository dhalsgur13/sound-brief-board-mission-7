import { randomUUID } from "node:crypto";

import { deleteRecord, insertRecord, listRecords, replaceRecord } from "./briefs-store.js";

export const allowedMoods = ["Warm", "Bright", "Dark", "Moving"];
export const allowedStatuses = ["draft", "ready"];

export class BriefError extends Error {
  constructor(status, code, message, fields = undefined) {
    super(message);
    this.name = "BriefError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseId(id) {
  if (!uuidPattern.test(id)) {
    throw new BriefError(400, "INVALID_ID", "Brief ID must be a valid UUID.");
  }
  return id;
}

export async function readJsonRequest(request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim();
  if (contentType !== "application/json") {
    throw new BriefError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as application/json.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 8192) {
    throw new BriefError(413, "PAYLOAD_TOO_LARGE", "Request body must be smaller than 8 KB.");
  }

  try {
    return await request.json();
  } catch {
    throw new BriefError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
}

export function parseCreateBrief(input) {
  const title = cleanText(input?.title);
  const goal = cleanText(input?.goal);
  const mood = cleanText(input?.mood);
  const fields = {};

  if (title.length < 2 || title.length > 80) fields.title = "Use 2–80 characters.";
  if (goal.length < 2 || goal.length > 160) fields.goal = "Use 2–160 characters.";
  if (!allowedMoods.includes(mood)) fields.mood = "Choose Warm, Bright, Dark, or Moving.";

  if (Object.keys(fields).length > 0) {
    throw new BriefError(400, "VALIDATION_ERROR", "Please check the highlighted brief fields.", fields);
  }
  return { title, goal, mood };
}

export function parseUpdateBrief(input) {
  const status = cleanText(input?.status);
  if (!allowedStatuses.includes(status)) {
    throw new BriefError(400, "VALIDATION_ERROR", "Status must be draft or ready.", {
      status: "Choose draft or ready.",
    });
  }
  return { status };
}

export async function getBriefs() {
  const records = await listRecords();
  return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createBrief(input) {
  const values = parseCreateBrief(input);
  const now = new Date().toISOString();
  const brief = {
    id: randomUUID(),
    ...values,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await insertRecord(brief);
  return brief;
}

export async function updateBrief(id, input) {
  parseId(id);
  const { status } = parseUpdateBrief(input);
  const current = (await listRecords()).find((brief) => brief.id === id);
  if (!current) throw new BriefError(404, "NOT_FOUND", "That brief does not exist.");
  const updated = { ...current, status, updatedAt: new Date().toISOString() };
  const stored = await replaceRecord(updated);
  if (!stored) throw new BriefError(404, "NOT_FOUND", "That brief no longer exists.");
  return updated;
}

export async function removeBrief(id) {
  parseId(id);
  const deleted = await deleteRecord(id);
  if (!deleted) throw new BriefError(404, "NOT_FOUND", "That brief does not exist.");
}

export function errorDetails(error) {
  if (error instanceof BriefError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
    };
  }
  console.error("Unexpected brief API error", error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "The server could not process the brief. Please try again.",
      },
    },
  };
}
