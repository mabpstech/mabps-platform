"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SaveBar } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import {
  editorFetchJson,
  useEditorPersistence,
} from "@/components/website/hooks/use-editor-persistence";
import {
  STUDIO_NAV,
  type StudioNavId,
} from "@/components/website/theme/controls";
import { ThemePreview, type PreviewDevice } from "@/components/website/theme/theme-preview";
import { ThemeStudioPanels } from "@/components/website/theme/theme-studio-panels";
import {
  duplicateThemeTokens,
  parseThemeImport,
  resetThemeTokens,
  serializeThemeExport,
} from "@/lib/website/theme";
import type { ThemeTokens } from "@/lib/website/theme/types";
import type { WebsiteTheme } from "@/lib/website/types";

export function ThemeStudio({
  siteId,
  theme,
  canManage,
  siteName,
}: {
  siteId: string;
  theme: WebsiteTheme;
  canManage: boolean;
  siteName?: string;
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState<ThemeTokens>(theme.tokens);
  const [customCss, setCustomCss] = useState<string | null>(theme.customCss);
  const [section, setSection] = useState<StudioNavId>("presets");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [importText, setImportText] = useState("");
  const [revision, setRevision] = useState(theme.updatedAt);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const skipDirty = useRef(false);
  const tokensRef = useRef(tokens);
  const customCssRef = useRef(customCss);
  tokensRef.current = tokens;
  customCssRef.current = customCss;

  useEffect(() => {
    skipDirty.current = true;
    setTokens(theme.tokens);
    setCustomCss(theme.customCss);
    setRevision(theme.updatedAt);
  }, [theme]);

  const { saveState, saveNow } = useEditorPersistence<{ theme?: WebsiteTheme }>({
    enabled: canManage,
    resourceKey: `theme:${siteId}`,
    revision,
    onRevisionChange: setRevision,
    skipNextDirtyRef: skipDirty,
    deps: [tokens, customCss],
    onRemoteUpdate: () => router.refresh(),
    onError: (error) => setToast({ message: error.message, tone: "error" }),
    onSaved: (result, { silent, editedDuringSave }) => {
      if (result.data?.theme && !editedDuringSave) {
        skipDirty.current = true;
        setTokens(result.data.theme.tokens);
        setCustomCss(result.data.theme.customCss);
      }
      if (!silent) {
        setToast({ message: "Theme saved", tone: "success" });
        router.refresh();
      }
    },
    save: async ({ expectedUpdatedAt, signal }) => {
      const data = await editorFetchJson<{ theme?: WebsiteTheme }>(
        `/api/website/sites/${siteId}/theme`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            tokens: tokensRef.current,
            customCss: customCssRef.current,
            expectedUpdatedAt,
          }),
        },
      );
      if (!data.theme?.updatedAt) throw new Error("Unable to save theme.");
      return { updatedAt: data.theme.updatedAt, data };
    },
  });

  function updateTokens(next: ThemeTokens) {
    setTokens(next);
  }

  function handleExport() {
    const json = serializeThemeExport(tokens, siteName || "Website theme");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mabps-theme-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast({ message: "Theme exported", tone: "success" });
  }

  function handleImport() {
    try {
      const next = parseThemeImport(importText);
      setTokens(next);
      setImportText("");
      setToast({
        message: "Theme imported. Save to apply it to your site.",
        tone: "success",
      });
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? err.message
            : "Couldn’t import that theme file.",
        tone: "error",
      });
    }
  }

  function handleDuplicate() {
    setTokens(duplicateThemeTokens(tokens));
    setToast({
      message: "Theme duplicated. Save to keep your changes.",
      tone: "success",
    });
  }

  function handleReset() {
    if (
      !window.confirm(
        "Reset this theme to Minimal White defaults? Unsaved changes will be lost.",
      )
    ) {
      return;
    }
    setTokens(resetThemeTokens());
    setCustomCss(null);
    setToast({
      message: "Theme reset to defaults. Save to apply.",
      tone: "success",
    });
  }

  return (
    <div className="space-y-4 pb-24">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveNow({ silent: false })}
          onReload={() => router.refresh()}
          label="Save theme"
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Design
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Theme Studio
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500">
            Shape the visual identity of your website — colors, type, chrome,
            and motion — with instant preview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canManage}
            onClick={handleExport}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Export
          </button>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setSection("import")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Import
          </button>
          <button
            type="button"
            disabled={!canManage}
            onClick={() =>
              setTokens({
                ...tokens,
                darkMode: {
                  ...tokens.darkMode,
                  preview: !tokens.darkMode.preview,
                },
              })
            }
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {tokens.darkMode.preview ? "Light preview" : "Dark preview"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[11rem_minmax(0,1fr)_minmax(22rem,0.95fr)]">
        <nav className="h-fit rounded-2xl border border-zinc-200 bg-white p-2">
          {STUDIO_NAV.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-zinc-900 font-medium text-white"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <ThemeStudioPanels
            section={section}
            tokens={tokens}
            customCss={customCss}
            siteId={siteId}
            canManage={canManage}
            onTokens={updateTokens}
            onCustomCss={setCustomCss}
            importText={importText}
            onImportText={setImportText}
            onImport={handleImport}
            onExport={handleExport}
            onDuplicate={handleDuplicate}
            onReset={handleReset}
          />
        </div>

        <aside className="h-fit xl:sticky xl:top-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <ThemePreview
              tokens={tokens}
              device={device}
              onDeviceChange={setDevice}
              siteName={siteName}
            />
          </div>
        </aside>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

/** @deprecated Prefer ThemeStudio — kept for import compatibility. */
export { ThemeStudio as ThemeEditor };
