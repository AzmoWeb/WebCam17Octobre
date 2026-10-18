"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };
type UIContext = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const Ctx = createContext<UIContext | null>(null);

export function useUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUI doit être utilisé dans <UIProvider>");
  return ctx;
}

const TOAST_ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TOAST_COLORS = { success: "text-success", error: "text-danger", info: "text-brand-hover" };

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      <div aria-live="polite" className="fixed inset-x-4 bottom-4 z-[200] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type];
          return (
            <div
              key={t.id}
              className="flex w-full animate-slide-in items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3 text-sm shadow-2xl sm:w-auto sm:max-w-sm sm:min-w-72"
            >
              <Icon className={cn("size-[18px] shrink-0", TOAST_COLORS[t.type])} />
              <span className="flex-1">{t.message}</span>
              <button
                className="rounded p-1 text-ink-dim hover:bg-panel-3 hover:text-ink"
                onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                aria-label="Fermer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <Modal onClose={() => close(false)}>
          <div className="p-5">
            <div className={cn("mb-4 grid size-11 place-items-center rounded-xl", dialog.danger ? "bg-danger/15 text-danger" : "bg-brand/15 text-brand-hover")}>
              <AlertTriangle className="size-5" />
            </div>
            <h3 className="text-lg font-bold">{dialog.title}</h3>
            {dialog.message && <p className="mt-2 text-sm text-ink-muted">{dialog.message}</p>}
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button onClick={() => close(false)}>Annuler</Button>
            <Button variant={dialog.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
              {dialog.confirmLabel ?? "Confirmer"}
            </Button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

/** Fenêtre modale : plein écran en bas sur mobile, centrée sur ordinateur. Échap / clic extérieur pour fermer. */
export function Modal({
  children,
  onClose,
  title,
  size = "md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[92vh] w-full animate-pop overflow-y-auto rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-5 py-4">
            <h3 className="text-lg font-bold">{title}</h3>
            <Button variant="ghost" size="sm" icon onClick={onClose} aria-label="Fermer">
              <X className="size-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
