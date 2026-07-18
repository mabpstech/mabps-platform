import { MemorySubnav } from "@/components/memory/memory-subnav";
import { requireMemoryWorkspace } from "@/lib/memory/access";
import { ensureMemoryReady } from "@/lib/memory/repository";

export default async function MemoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMemoryWorkspace("/memory");
  ensureMemoryReady();

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <MemorySubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
