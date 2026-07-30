"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const MediaLibraryClient = dynamic(
  () =>
    import("@/components/website/media-library").then((mod) => mod.MediaLibrary),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading media library…
      </div>
    ),
  },
);

type MediaLibraryProps = ComponentProps<
  typeof import("@/components/website/media-library").MediaLibrary
>;

export function MediaLibraryDynamic(props: MediaLibraryProps) {
  return <MediaLibraryClient {...props} />;
}
