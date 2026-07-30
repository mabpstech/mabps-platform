"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const PageBuilderClient = dynamic(
  () =>
    import("@/components/website/page-builder").then((mod) => mod.PageBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading page builder…
      </div>
    ),
  },
);

type PageBuilderProps = ComponentProps<
  typeof import("@/components/website/page-builder").PageBuilder
>;

export function PageBuilderDynamic(props: PageBuilderProps) {
  return <PageBuilderClient {...props} />;
}
