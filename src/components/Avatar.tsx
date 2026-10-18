import { cn, colorFor } from "@/lib/utils";

const SIZES = { xs: "size-6 text-[11px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-3xl sm:size-28" };

export default function Avatar({ name, size = "md", className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold text-white uppercase select-none", SIZES[size], className)}
      style={{ background: `linear-gradient(135deg, ${colorFor(name)}, ${colorFor(name + "x")})` }}
    >
      {name.slice(0, 1) || "?"}
    </span>
  );
}
