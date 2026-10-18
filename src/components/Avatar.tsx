import { colorFor } from "@/lib/utils";

export default function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(135deg, ${colorFor(name)}, ${colorFor(name + "x")})`,
      }}
      aria-hidden
    >
      {name.slice(0, 1) || "?"}
    </span>
  );
}
