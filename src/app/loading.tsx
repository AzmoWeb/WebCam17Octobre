import { Skeleton, StreamGridSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-64 w-full rounded-2xl sm:h-80" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="ml-auto h-10 w-56" />
      </div>
      <StreamGridSkeleton />
    </div>
  );
}
