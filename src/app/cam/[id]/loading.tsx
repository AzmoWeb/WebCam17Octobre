import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Chargement">
      <div className="flex flex-col gap-5">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <div className="flex gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-64" />
          </div>
        </div>
      </div>
      <Skeleton className="hidden h-[calc(100dvh-6.5rem)] rounded-xl lg:block" />
    </div>
  );
}
