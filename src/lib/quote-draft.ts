import type { QuoteFormState } from "@/components/quote-editor";

const PREFIX = "rf-quote-draft:";

export function quoteDraftKey(key: string) {
  return `${PREFIX}${key}`;
}

export function saveQuoteDraft(key: string, state: QuoteFormState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      quoteDraftKey(key),
      JSON.stringify({ savedAt: new Date().toISOString(), state }),
    );
  } catch {
    // storage full or unavailable — autosave is best-effort
  }
}

export function loadQuoteDraft(
  key: string,
): { savedAt: string; state: QuoteFormState } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(quoteDraftKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: string; state?: QuoteFormState };
    if (!parsed?.state) return null;
    return { savedAt: parsed.savedAt ?? "", state: parsed.state };
  } catch {
    return null;
  }
}

export function clearQuoteDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(quoteDraftKey(key));
  } catch {
    // ignore
  }
}
