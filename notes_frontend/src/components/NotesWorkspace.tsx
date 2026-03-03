"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyNote,
  deleteNoteLocal,
  listNotesLocal,
  Note,
  upsertNoteLocal,
} from "@/lib/storage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export type NotesWorkspaceProps = {
  user: { id: string; email: string };
  onLogout: () => void;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function uniqueTags(notes: Note[]): string[] {
  const set = new Set<string>();
  for (const n of notes) for (const t of n.tags) set.add(t);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function applyFilter(
  notes: Note[],
  query: string,
  tagFilter: string | null,
): Note[] {
  const q = normalize(query);
  return notes.filter((n) => {
    if (tagFilter && !n.tags.includes(tagFilter)) return false;
    if (!q) return true;
    const hay = `${n.title}\n${n.body}\n${n.tags.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function parseTags(input: string): string[] {
  const parts = input
    .split(",")
    .map((p) => normalize(p))
    .filter(Boolean);
  return Array.from(new Set(parts));
}

// PUBLIC_INTERFACE
export function NotesWorkspace(props: NotesWorkspaceProps) {
  /** Full workspace: header + tags sidebar + notes list + editor with autosave. */
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string>("");

  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");

  const debouncedTitle = useDebouncedValue(titleDraft, 650);
  const debouncedBody = useDebouncedValue(bodyDraft, 650);
  const debouncedTags = useDebouncedValue(tagsDraft, 650);

  const didInit = useRef(false);

  // initial load
  useEffect(() => {
    const loaded = listNotesLocal(props.user.id);
    setNotes(loaded);
    if (loaded.length > 0) setSelectedId(loaded[0].id);
  }, [props.user.id]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId],
  );

  const allTags = useMemo(() => uniqueTags(notes), [notes]);

  const filteredNotes = useMemo(
    () => applyFilter(notes, query, tagFilter),
    [notes, query, tagFilter],
  );

  // sync drafts when selection changes
  useEffect(() => {
    if (!selected) {
      setTitleDraft("");
      setBodyDraft("");
      setTagsDraft("");
      return;
    }
    setTitleDraft(selected.title);
    setBodyDraft(selected.body);
    setTagsDraft(selected.tags.join(", "));
    setSaveState("idle");
    setSaveMessage("");
    didInit.current = true;
  }, [selected]);

  // autosave (local) when drafts change
  useEffect(() => {
    if (!didInit.current) return;
    if (!selected) return;

    const next: Note = {
      ...selected,
      title: debouncedTitle.trim() ? debouncedTitle : "Untitled",
      body: debouncedBody,
      tags: parseTags(debouncedTags),
      updatedAt: new Date().toISOString(),
    };

    // Avoid churning "saved" state on initial equal values.
    const changed =
      next.title !== selected.title ||
      next.body !== selected.body ||
      next.tags.join(",") !== selected.tags.join(",");

    if (!changed) return;

    setSaveState("saving");
    setSaveMessage("Autosaving…");

    try {
      upsertNoteLocal(props.user.id, next);
      const updated = listNotesLocal(props.user.id);
      setNotes(updated);
      setSaveState("saved");
      setSaveMessage(`Saved • ${formatUpdatedAt(next.updatedAt)}`);
    } catch {
      setSaveState("error");
      setSaveMessage("Autosave failed (local storage).");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedBody, debouncedTags]);

  function handleNewNote() {
    const n = createEmptyNote(props.user.id);
    const updated = listNotesLocal(props.user.id);
    setNotes(updated);
    setSelectedId(n.id);
  }

  function handleDeleteSelected() {
    if (!selected) return;
    const ok = window.confirm("Delete this note? This cannot be undone.");
    if (!ok) return;
    deleteNoteLocal(props.user.id, selected.id);
    const updated = listNotesLocal(props.user.id);
    setNotes(updated);
    setSelectedId(updated[0]?.id || null);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function clearFilters() {
    setQuery("");
    setTagFilter(null);
  }

  return (
    <div className="w-full">
      <header className="retro-header">
        <div className="retro-container flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="retro-card-sm px-3 py-2">
              <span className="font-black">RETRO NOTES</span>
            </div>
            <span className="retro-pill">
              {saveState === "saving"
                ? "SAVING"
                : saveState === "saved"
                  ? "SAVED"
                  : saveState === "error"
                    ? "ERROR"
                    : "READY"}
            </span>
            <span className="hidden md:inline text-sm text-[color:var(--muted)]">
              {saveMessage}
            </span>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="retro-card-sm px-3 py-2 text-sm">
              <span className="font-bold">User:</span>{" "}
              <span className="text-[color:var(--muted)]">
                {props.user.email}
              </span>
            </div>
            <button className="retro-button" onClick={props.onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="retro-container">
        <div className="workspace-grid">
          {/* Tags sidebar */}
          <aside className="retro-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black">TAGS</h2>
              <button className="retro-button" onClick={clearFilters}>
                Clear
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <button
                className="retro-button w-full"
                onClick={() => setTagFilter(null)}
                aria-pressed={tagFilter === null}
              >
                All notes ({notes.length})
              </button>

              <div className="max-h-[50vh] overflow-auto pr-1 space-y-2">
                {allTags.length === 0 ? (
                  <p className="text-sm text-[color:var(--muted)]">
                    No tags yet. Add tags in the editor (comma-separated).
                  </p>
                ) : (
                  allTags.map((t) => (
                    <button
                      key={t}
                      className="retro-button w-full text-left"
                      onClick={() => setTagFilter(t)}
                      aria-pressed={tagFilter === t}
                      title={`Filter by ${t}`}
                    >
                      #{t}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 retro-card-sm p-3 text-sm">
              <p className="font-black mb-1">Tips</p>
              <p className="text-[color:var(--muted)]">
                Search looks at title, body, and tags.
              </p>
              <p className="text-[color:var(--muted)] mt-2">
                Tag format:{" "}
                <span className="kbd" aria-label="Example tags">
                  work, ideas, todo
                </span>
              </p>
            </div>
          </aside>

          {/* Notes list */}
          <section className="retro-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black">NOTES</h2>
              <button className="retro-button retro-button-primary" onClick={handleNewNote}>
                + New
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-sm font-bold" htmlFor="search">
                Search
              </label>
              <input
                id="search"
                className="retro-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes…"
              />

              {tagFilter ? (
                <div className="text-xs text-[color:var(--muted)]">
                  Filtering by <span className="font-bold">#{tagFilter}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 max-h-[60vh] overflow-auto pr-1 space-y-2">
              {filteredNotes.length === 0 ? (
                <div className="retro-card-sm p-3">
                  <p className="font-bold">No notes found.</p>
                  <p className="text-sm text-[color:var(--muted)]">
                    Try clearing filters or create a new note.
                  </p>
                </div>
              ) : (
                filteredNotes.map((n) => (
                  <button
                    key={n.id}
                    className="retro-card-sm w-full p-3 text-left"
                    onClick={() => handleSelect(n.id)}
                    aria-current={n.id === selectedId ? "true" : undefined}
                    title={n.title}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black truncate">{n.title}</p>
                        <p className="text-xs text-[color:var(--muted)] truncate">
                          {n.body ? n.body.replace(/\s+/g, " ").slice(0, 80) : "—"}
                        </p>
                      </div>
                      <span className="retro-pill">{n.tags.length} tags</span>
                    </div>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">
                      Updated: {formatUpdatedAt(n.updatedAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Editor */}
          <section className="retro-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black">EDITOR</h2>
              <div className="flex items-center gap-2">
                <button
                  className="retro-button"
                  onClick={handleDeleteSelected}
                  disabled={!selected}
                >
                  Delete
                </button>
              </div>
            </div>

            {!selected ? (
              <div className="mt-4 retro-card-sm p-3">
                <p className="font-bold">No note selected.</p>
                <p className="text-sm text-[color:var(--muted)]">
                  Create a new note to start writing.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-bold" htmlFor="title">
                    Title
                  </label>
                  <input
                    id="title"
                    className="retro-input"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="Untitled"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold" htmlFor="tags">
                    Tags (comma-separated)
                  </label>
                  <input
                    id="tags"
                    className="retro-input"
                    value={tagsDraft}
                    onChange={(e) => setTagsDraft(e.target.value)}
                    placeholder="work, ideas, todo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold" htmlFor="body">
                    Body
                  </label>
                  <textarea
                    id="body"
                    className="retro-textarea"
                    value={bodyDraft}
                    onChange={(e) => setBodyDraft(e.target.value)}
                    placeholder="Start typing… autosave is on."
                  />
                </div>

                <div className="retro-card-sm p-3 text-xs text-[color:var(--muted)]">
                  <p className="font-bold text-[color:var(--text)]">Autosave</p>
                  <p className="mt-1">
                    Changes save automatically after a short pause.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-6 text-xs text-[color:var(--muted)]">
          <div className="retro-card-sm p-3">
            <p className="font-bold">Backend integration</p>
            <p className="mt-1">
              Set{" "}
              <span className="kbd">NEXT_PUBLIC_API_BASE_URL</span> to your
              FastAPI base URL. Current backend OpenAPI exposes only a health
              endpoint; this UI runs in local mode until auth/notes APIs are available.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
