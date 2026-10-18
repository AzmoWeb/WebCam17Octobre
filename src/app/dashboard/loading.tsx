import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-64 rounded-xl" />
      <div className="flex flex-col gap-5">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
