/**
 * Browser storage for the opaque signed pass. Holding a pass grants nothing by
 * itself: every protected request is re-verified by the server.
 */
export const CONTENT_PASS_KEY = "vw_content_pass_v1";

type Saver = (pass: string) => Promise<void>;
let onSave: Saver | null = null;

export function readContentPass(): string | null {
  try {
    return localStorage.getItem(CONTENT_PASS_KEY);
  } catch {
    return null;
  }
}

export function writeContentPass(pass: string | null) {
  try {
    if (pass === null) localStorage.removeItem(CONTENT_PASS_KEY);
    else localStorage.setItem(CONTENT_PASS_KEY, pass);
  } catch {
    /* storage unavailable */
  }
}

/** Registered by the subjunctive store so a new pass reloads protected content. */
export function setPassSaver(fn: Saver) {
  onSave = fn;
}

export async function saveContentPass(pass: string | null | undefined) {
  if (!pass) return;
  writeContentPass(pass);
  if (onSave) await onSave(pass);
}
