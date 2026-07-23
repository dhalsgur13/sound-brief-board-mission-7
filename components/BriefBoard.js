"use client";

import { useCallback, useEffect, useState } from "react";

const initialForm = {
  title: "",
  goal: "",
  mood: "Warm",
};

class ApiError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = "ApiError";
    this.fields = fields;
  }
}

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "The server could not complete the request.",
      payload?.error?.fields,
    );
  }
  return payload;
}

export default function BriefBoard() {
  const [briefs, setBriefs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [listMessage, setListMessage] = useState("");
  const [listError, setListError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    setListError("");
    setListMessage("");
    try {
      const payload = await readJson(await fetch("/api/briefs", { cache: "no-store" }));
      setBriefs(payload.data);
    } catch (requestError) {
      setListError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function submitBrief(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormMessage("");
    setFieldErrors({});
    try {
      const payload = await readJson(
        await fetch("/api/briefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      );
      setBriefs((current) => [payload.data, ...current]);
      setForm(initialForm);
      setFormMessage("Brief saved to the server.");
    } catch (requestError) {
      setFormError(requestError.message);
      setFieldErrors(requestError.fields ?? {});
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(brief) {
    setListError("");
    setListMessage("");
    setPendingAction({ id: brief.id, kind: "status" });
    const nextStatus = brief.status === "draft" ? "ready" : "draft";
    try {
      const payload = await readJson(
        await fetch(`/api/briefs/${brief.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }),
      );
      setBriefs((current) =>
        current
          .map((item) => (item.id === brief.id ? payload.data : item))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      );
      setListMessage(`Marked “${brief.title}” as ${nextStatus}.`);
    } catch (requestError) {
      setListError(requestError.message);
    } finally {
      setPendingAction(null);
    }
  }

  async function removeBrief(brief) {
    if (!window.confirm(`Delete “${brief.title}”?`)) return;
    setListError("");
    setListMessage("");
    setPendingAction({ id: brief.id, kind: "delete" });
    try {
      const response = await fetch(`/api/briefs/${brief.id}`, { method: "DELETE" });
      if (!response.ok) await readJson(response);
      setBriefs((current) => current.filter((item) => item.id !== brief.id));
      setListMessage("Brief deleted.");
    } catch (requestError) {
      setListError(requestError.message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="workspace" aria-label="Sound brief workspace">
      <form className="composer" onSubmit={submitBrief}>
        <div className="section-heading">
          <div>
            <p className="section-kicker">CREATE</p>
            <h2>Save a new brief</h2>
          </div>
          <span className="api-chip">POST /api/briefs</span>
        </div>

        <div className="feedback form-feedback" aria-live="polite">
          {formError ? <p className="error-message">{formError}</p> : null}
          {!formError && formMessage ? <p className="success-message">{formMessage}</p> : null}
        </div>

        <label>
          Brief title
          <input
            name="title"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Warm midnight bass"
            minLength={2}
            maxLength={80}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "title-error" : undefined}
            required
          />
          {fieldErrors.title ? <span className="field-error" id="title-error">{fieldErrors.title}</span> : null}
        </label>

        <label>
          Production goal
          <textarea
            name="goal"
            value={form.goal}
            onChange={(event) => updateField("goal", event.target.value)}
            placeholder="A soft bass that leaves room for the vocal."
            minLength={2}
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.goal)}
            aria-describedby={fieldErrors.goal ? "goal-error" : undefined}
            required
          />
          {fieldErrors.goal ? <span className="field-error" id="goal-error">{fieldErrors.goal}</span> : null}
        </label>

        <div className="form-row">
          <label>
            Mood
            <select
              name="mood"
              value={form.mood}
              onChange={(event) => updateField("mood", event.target.value)}
              aria-invalid={Boolean(fieldErrors.mood)}
              aria-describedby={fieldErrors.mood ? "mood-error" : undefined}
            >
              <option>Warm</option>
              <option>Bright</option>
              <option>Dark</option>
              <option>Moving</option>
            </select>
            {fieldErrors.mood ? <span className="field-error" id="mood-error">{fieldErrors.mood}</span> : null}
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save brief"}
          </button>
        </div>
        <p className="privacy-note">Demo only. Do not enter personal or confidential information.</p>
      </form>

      <div className="collection">
        <div className="section-heading">
          <div>
            <p className="section-kicker">SERVER DATA</p>
            <h2>Saved briefs</h2>
          </div>
          <button className="text-button" type="button" onClick={loadBriefs} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="feedback" aria-live="polite">
          {listError ? <p className="error-message">{listError}</p> : null}
          {!listError && listMessage ? <p className="success-message">{listMessage}</p> : null}
        </div>

        {loading ? <p className="empty-state">Loading briefs from the server…</p> : null}
        {!loading && !listError && briefs.length === 0 ? (
          <div className="empty-state">
            <strong>No saved briefs yet.</strong>
            <span>Create the first one with the form.</span>
          </div>
        ) : null}

        <div className="brief-grid">
          {briefs.map((brief) => (
            <article
              className="brief-card"
              key={brief.id}
              aria-busy={pendingAction?.id === brief.id}
            >
              <div className="card-topline">
                <span className={`status status-${brief.status}`}>{brief.status}</span>
                <span className="mood">{brief.mood}</span>
              </div>
              <h3>{brief.title}</h3>
              <p>{brief.goal}</p>
              <time dateTime={brief.updatedAt}>
                Updated {new Date(brief.updatedAt).toLocaleDateString("en-US")}
              </time>
              <div className="card-actions">
                <button
                  type="button"
                  onClick={() => toggleStatus(brief)}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction?.id === brief.id && pendingAction.kind === "status"
                    ? "Updating…"
                    : `Mark ${brief.status === "draft" ? "ready" : "draft"}`}
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => removeBrief(brief)}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction?.id === brief.id && pendingAction.kind === "delete"
                    ? "Deleting…"
                    : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
