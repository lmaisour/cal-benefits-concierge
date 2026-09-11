export const FOLLOWUP_STORAGE_KEY = "cbf.followup.v1";
export const FOLLOWUP_CHANGE_EVENT = "cbf-followup-change";

export type FollowupPersistedState = {
  byProgram: Record<string, Record<string, string>>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function subscribeFollowup(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(FOLLOWUP_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(FOLLOWUP_CHANGE_EVENT, onChange);
}

export function getFollowupSnapshot(): string {
  if (!canUseSessionStorage()) {
    return "";
  }
  try {
    return sessionStorage.getItem(FOLLOWUP_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getFollowupServerSnapshot(): string {
  return "";
}

function notifyFollowupListeners(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(FOLLOWUP_CHANGE_EVENT));
}

export function parseFollowupSnapshot(raw: string): FollowupPersistedState {
  if (!raw) {
    return { byProgram: {} };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed) || !isPlainObject(parsed.byProgram)) {
      return { byProgram: {} };
    }
    const byProgram: Record<string, Record<string, string>> = {};
    for (const [programId, answers] of Object.entries(parsed.byProgram)) {
      if (!isPlainObject(answers)) {
        continue;
      }
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        if (typeof value === "string" && value.trim() !== "") {
          next[key] = value.trim();
        }
      }
      if (Object.keys(next).length > 0) {
        byProgram[programId] = next;
      }
    }
    return { byProgram };
  } catch {
    return { byProgram: {} };
  }
}

export function readFollowupState(): FollowupPersistedState {
  return parseFollowupSnapshot(getFollowupSnapshot());
}

export function writeFollowupProgramAnswers(
  programId: string,
  answers: Record<string, string>,
): FollowupPersistedState {
  const current = readFollowupState();
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (value.trim() !== "") {
      cleaned[key] = value.trim();
    }
  }
  const next: FollowupPersistedState = {
    byProgram: {
      ...current.byProgram,
      [programId]: cleaned,
    },
  };
  if (Object.keys(cleaned).length === 0) {
    const rest = { ...next.byProgram };
    delete rest[programId];
    next.byProgram = rest;
  }
  persistFollowup(next);
  return next;
}

export function clearFollowupState(): void {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    sessionStorage.removeItem(FOLLOWUP_STORAGE_KEY);
    notifyFollowupListeners();
  } catch {
    // Ignore storage failures when starting over.
  }
}

function persistFollowup(state: FollowupPersistedState): void {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    sessionStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(state));
    notifyFollowupListeners();
  } catch {
    // Private mode or quota — answers stay in memory for this submit only.
  }
}
