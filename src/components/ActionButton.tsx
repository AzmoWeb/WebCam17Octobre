"use client";

import { useTransition } from "react";
import { useUI } from "./UIProvider";
import type { ActionResult } from "@/lib/utils";

type Props = {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  fields: Record<string, string | number>;
  children: React.ReactNode;
  className?: string;
  title?: string;
  confirm?: { title: string; message?: string; confirmLabel?: string; danger?: boolean };
  onDone?: () => void;
};

/** Bouton qui appelle une server action, avec confirmation facultative et toast du résultat. */
export default function ActionButton({ action, fields, children, className = "btn", title, confirm, onDone }: Props) {
  const ui = useUI();
  const [pending, start] = useTransition();

  async function run() {
    if (confirm && !(await ui.confirm(confirm))) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
    start(async () => {
      const res = await action(fd);
      if (res.ok) {
        if (res.message) ui.toast(res.message);
        onDone?.();
      } else ui.toast(res.error, "error");
    });
  }

  return (
    <button type="button" className={className} onClick={run} disabled={pending} title={title}>
      {children}
    </button>
  );
}
