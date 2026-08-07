import { useCallback, useEffect, useRef, useState } from "react";

interface Options<T> {
  state: T;
  /** Only auto-save when the form is ready/valid enough to persist. */
  enabled: boolean;
  save: (state: T) => Promise<void>;
  /** How often to check for changes (ms). */
  intervalMs?: number;
}

/**
 * Persists the form to the server whenever it changes, without the user
 * pressing "Salvar". Best-effort: failures are ignored and retried on the
 * next tick, so the local draft keeps acting as the safety net.
 */
export function useQuoteAutosave<T>({ state, enabled, save, intervalMs = 1500 }: Options<T>) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const saveRef = useRef(save);
  saveRef.current = save;
  const lastSavedRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const markSaved = useCallback((value: T) => {
    lastSavedRef.current = JSON.stringify(value);
    setSavedAt(new Date().toLocaleTimeString("pt-BR"));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const flush = async () => {
      if (cancelled || inFlightRef.current) return;
      const snapshot = JSON.stringify(stateRef.current);
      if (lastSavedRef.current === null) {
        lastSavedRef.current = snapshot;
        return;
      }
      if (snapshot === lastSavedRef.current) return;
      inFlightRef.current = true;
      setSaving(true);
      try {
        await saveRef.current(stateRef.current);
        lastSavedRef.current = snapshot;
        setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      } catch {
        // keep the previous snapshot so the next tick retries
      } finally {
        inFlightRef.current = false;
        setSaving(false);
      }
    };

    const id = window.setInterval(flush, intervalMs);
    return () => {
      void flush();
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, intervalMs]);

  return { savedAt, saving, markSaved };
}
