"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useUI } from "./UIProvider";
import type { ActionResult } from "@/lib/utils";

type Props = {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  fields: Record<string, string | number>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: boolean;
  title?: string;
  confirm?: { title: string; message?: string; confirmLabel?: string; danger?: boolean };
  onDone?: (data: unknown) => void;
  redirectTo?: string;
};

/** Bouton qui appelle une server action, avec confirmation facultative et notification du résultat. */
export default function ActionButton({ action, fields, children, variant, size = "sm", icon, title, confirm, onDone, redirectTo }: Props) {
  const ui = useUI();
  const router = useRouter();
  const [pending, start] = useTransition();

  async function run() {
    if (confirm && !(await ui.confirm(confirm))) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
    start(async () => {
      const res = await action(fd);
      if (!res.ok) return ui.toast(res.error, "error");
      if (res.message) ui.toast(res.message);
      onDone?.(res.data);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Button variant={variant} size={size} icon={icon} title={title} aria-label={title} onClick={run} loading={pending}>
      {!pending && children}
    </Button>
  );
}
