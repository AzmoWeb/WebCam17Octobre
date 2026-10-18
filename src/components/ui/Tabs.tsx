"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = { value: T; label: ReactNode; icon?: ReactNode; count?: number };

/** Onglets segmentés, défilables horizontalement sur mobile. */
export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  stretch,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  stretch?: boolean;
}) {
  return (
    <div role="tablist" className={cn("no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-lg bg-panel-2 p-1", className)}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
              stretch && "flex-1",
              active ? "bg-panel-3 text-ink shadow" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px]",
                  active ? "bg-brand text-white" : "bg-panel-3 text-ink-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
