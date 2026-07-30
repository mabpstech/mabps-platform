"use client";

/**
 * Shared editing reliability for website editors:
 * autosave, dirty tracking, leave protection, save retries, conflict detection.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

export type SaveState =
  | "idle"
  | "dirty"
  | "saving"
  | "retrying"
  | "saved"
  | "error"
  | "conflict";

export class EditorConflictError extends Error {
  readonly code = "edit_conflict" as const;
  readonly currentUpdatedAt?: string;

  constructor(message: string, currentUpdatedAt?: string) {
    super(message);
    this.name = "EditorConflictError";
    this.currentUpdatedAt = currentUpdatedAt;
  }
}

export class EditorNetworkError extends Error {
  constructor(message = "Network error while saving.") {
    super(message);
    this.name = "EditorNetworkError";
  }
}

type EditorSaveResult<T> = {
  updatedAt: string;
  data?: T;
};

type EditorSaveContext = {
  expectedUpdatedAt: string;
  signal: AbortSignal;
};

type BroadcastMessage =
  | { type: "saved"; updatedAt: string; sessionId: string }
  | { type: "conflict-notice"; updatedAt: string; sessionId: string };

const DEFAULT_DEBOUNCE_MS = 2500;
const DEFAULT_MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof EditorConflictError) return false;
  if (error instanceof EditorNetworkError) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("failed to fetch") || message.includes("network")) {
      return true;
    }
    if (message.includes("503") || message.includes("502") || message.includes("504")) {
      return true;
    }
  }
  return false;
}

export async function editorFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new EditorNetworkError();
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (
    response.status === 409 ||
    data.code === "edit_conflict"
  ) {
    throw new EditorConflictError(
      typeof data.error === "string"
        ? data.error
        : "This content was modified in another session. Reload to continue editing.",
      typeof data.currentUpdatedAt === "string"
        ? data.currentUpdatedAt
        : undefined,
    );
  }

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : `Save failed (${response.status}).`;
    if (response.status >= 500) {
      throw new EditorNetworkError(message);
    }
    throw new Error(message);
  }

  return data as T;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => resolve(), ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function useEditorPersistence<T = unknown>({
  enabled,
  resourceKey,
  revision,
  onRevisionChange,
  deps,
  save,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  skipNextDirtyRef,
  onSaved,
  onError,
  onRemoteUpdate,
}: {
  enabled: boolean;
  resourceKey: string;
  revision: string;
  onRevisionChange: (next: string) => void;
  deps: unknown[];
  save: (ctx: EditorSaveContext) => Promise<EditorSaveResult<T>>;
  debounceMs?: number;
  maxRetries?: number;
  skipNextDirtyRef?: MutableRefObject<boolean>;
  onSaved?: (
    result: EditorSaveResult<T>,
    meta: { silent: boolean; editedDuringSave: boolean },
  ) => void;
  onError?: (error: Error) => void;
  /** Called when another session saved and this editor is clean — typically router.refresh(). */
  onRemoteUpdate?: () => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveStateRef = useRef<SaveState>("idle");
  const revisionRef = useRef(revision);
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Math.random().toString(36).slice(2)}`,
  );
  const hydratedRef = useRef(false);
  const savingRef = useRef(false);
  const editVersionRef = useRef(0);
  const pendingSilentRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const saveFnRef = useRef(save);
  const onRevisionChangeRef = useRef(onRevisionChange);
  const onSavedRef = useRef(onSaved);
  const onErrorRef = useRef(onError);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);

  revisionRef.current = revision;
  saveFnRef.current = save;
  onRevisionChangeRef.current = onRevisionChange;
  onSavedRef.current = onSaved;
  onErrorRef.current = onError;
  onRemoteUpdateRef.current = onRemoteUpdate;

  const setState = useCallback((next: SaveState) => {
    saveStateRef.current = next;
    setSaveState(next);
  }, []);

  const broadcast = useCallback(
    (message: BroadcastMessage) => {
      if (typeof BroadcastChannel === "undefined") return;
      try {
        const channel = new BroadcastChannel(`mabps-edit:${resourceKey}`);
        channel.postMessage(message);
        channel.close();
      } catch {
        // BroadcastChannel unavailable — server 409 still protects writes.
      }
    },
    [resourceKey],
  );

  const runSave = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!enabled || savingRef.current) return false;
      const startingState: SaveState = saveStateRef.current;
      if (startingState === "conflict") return false;

      savingRef.current = true;
      const versionAtStart = editVersionRef.current;
      const expectedUpdatedAt = revisionRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let attempt = 0;

      try {
        while (true) {
          try {
            if (attempt > 0) {
              setState("retrying");
              await sleep(
                RETRY_BASE_MS * 2 ** Math.min(attempt - 1, 3),
                controller.signal,
              );
            } else {
              setState("saving");
            }

            const result = await saveFnRef.current({
              expectedUpdatedAt,
              signal: controller.signal,
            });

            const editedDuringSave = editVersionRef.current !== versionAtStart;
            revisionRef.current = result.updatedAt;
            onRevisionChangeRef.current(result.updatedAt);
            broadcast({
              type: "saved",
              updatedAt: result.updatedAt,
              sessionId: sessionIdRef.current,
            });

            onSavedRef.current?.(result, {
              silent,
              editedDuringSave,
            });

            if (editedDuringSave) {
              setState("dirty");
              pendingSilentRef.current = true;
            } else {
              setState("saved");
              window.setTimeout(() => {
                if (saveStateRef.current === "saved") setState("idle");
              }, 1800);
            }
            return true;
          } catch (error) {
            if (controller.signal.aborted) return false;

            if (error instanceof EditorConflictError) {
              if (error.currentUpdatedAt) {
                revisionRef.current = error.currentUpdatedAt;
                onRevisionChangeRef.current(error.currentUpdatedAt);
              }
              setState("conflict");
              broadcast({
                type: "conflict-notice",
                updatedAt: error.currentUpdatedAt ?? revisionRef.current,
                sessionId: sessionIdRef.current,
              });
              onErrorRef.current?.(error);
              return false;
            }

            attempt += 1;
            if (attempt <= maxRetries && isRetryableError(error)) {
              continue;
            }

            setState("error");
            onErrorRef.current?.(
              error instanceof Error ? error : new Error("Couldn’t save changes."),
            );
            return false;
          }
        }
      } finally {
        savingRef.current = false;
        const latest: SaveState = saveStateRef.current;
        if (
          editVersionRef.current !== versionAtStart &&
          latest !== "conflict" &&
          latest !== "error" &&
          latest !== "dirty"
        ) {
          setState("dirty");
        }
      }
    },
    [broadcast, enabled, maxRetries, setState],
  );

  const saveNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      pendingSilentRef.current = opts?.silent ?? false;
      return runSave({ silent: opts?.silent ?? false });
    },
    [runSave],
  );

  // Debounced autosave when draft deps change.
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    if (skipNextDirtyRef?.current) {
      skipNextDirtyRef.current = false;
      return;
    }
    if (!enabled) return;
    if (saveStateRef.current === "conflict") return;

    editVersionRef.current += 1;
    pendingSilentRef.current = true;
    setState(savingRef.current ? saveStateRef.current : "dirty");

    const timer = window.setTimeout(() => {
      void runSave({ silent: true });
    }, debounceMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
  }, [enabled, debounceMs, runSave, setState, skipNextDirtyRef, ...deps]);

  // Cross-tab awareness via BroadcastChannel.
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") return;
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(`mabps-edit:${resourceKey}`);
    } catch {
      return;
    }

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;
      if (!message || message.sessionId === sessionIdRef.current) return;
      if (message.type !== "saved" && message.type !== "conflict-notice") return;
      if (message.updatedAt === revisionRef.current) return;

      const localDirty =
        saveStateRef.current === "dirty" ||
        saveStateRef.current === "saving" ||
        saveStateRef.current === "retrying" ||
        saveStateRef.current === "error";

      revisionRef.current = message.updatedAt;
      onRevisionChangeRef.current(message.updatedAt);

      if (localDirty) {
        setState("conflict");
      } else {
        onRemoteUpdateRef.current?.();
      }
    };

    return () => channel.close();
  }, [enabled, resourceKey, setState]);

  // Tab close / refresh protection while work is at risk.
  const isProtected =
    enabled &&
    (saveState === "dirty" ||
      saveState === "saving" ||
      saveState === "retrying" ||
      saveState === "error" ||
      saveState === "conflict");

  useEffect(() => {
    if (!isProtected) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isProtected]);

  // In-app link navigation protection (App Router has no stable useBlocker yet).
  useEffect(() => {
    if (!isProtected) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      const ok = window.confirm(
        "You have unsaved changes. Leave this page and discard them?",
      );
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isProtected]);

  // Flush pending autosave when the tab becomes hidden.
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (
        saveStateRef.current === "dirty" ||
        saveStateRef.current === "error"
      ) {
        void runSave({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, runSave]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    saveState,
    saveNow,
    isProtected,
    editVersionRef,
  };
}
