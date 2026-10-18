import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-6.5rem)] gap-5" aria-busy="true" aria-label="Chargement">
      <Skeleton className="hidden w-80 rounded-xl lg:block" />
      <Skeleton className="flex-1 rounded-xl" />
    </div>
  );
}
