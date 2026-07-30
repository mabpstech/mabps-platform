"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const WorkflowBuilderClient = dynamic(
  () =>
    import("@/components/automation/workflow-builder").then(
      (mod) => mod.WorkflowBuilder,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading workflow builder…
      </div>
    ),
  },
);

type WorkflowBuilderProps = ComponentProps<
  typeof import("@/components/automation/workflow-builder").WorkflowBuilder
>;

export function WorkflowBuilderDynamic(props: WorkflowBuilderProps) {
  return <WorkflowBuilderClient {...props} />;
}
