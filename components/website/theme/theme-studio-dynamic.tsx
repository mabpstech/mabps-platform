"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ThemeStudioClient = dynamic(
  () =>
    import("@/components/website/theme/theme-studio").then(
      (mod) => mod.ThemeStudio,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading theme studio…
      </div>
    ),
  },
);

type ThemeStudioProps = ComponentProps<
  typeof import("@/components/website/theme/theme-studio").ThemeStudio
>;

export function ThemeStudioDynamic(props: ThemeStudioProps) {
  return <ThemeStudioClient {...props} />;
}
