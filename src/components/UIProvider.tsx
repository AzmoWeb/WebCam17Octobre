"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
};

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

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
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

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn("toast", t.type)}>
            {t.type === "success" ? <CheckCircle2 size={18} /> : t.type === "error" ? <XCircle size={18} /> : <Info size={18} />}
            <span className="grow">{t.message}</span>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <Modal onClose={() => close(false)}>
          <div className="modal-body">
            <div className={cn("modal-icon", dialog.danger && "danger")}>
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: 18 }}>{dialog.title}</h3>
            {dialog.message && (
              <p className="text-2" style={{ marginTop: 8 }}>
                {dialog.message}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => close(false)}>
              Annuler
            </button>
            <button className={cn("btn", dialog.danger ? "btn-danger" : "btn-primary")} onClick={() => close(true)} autoFocus>
              {dialog.confirmLabel ?? "Confirmer"}
            </button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function Modal({
  children,
  onClose,
  title,
  maxWidth,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={maxWidth ? { maxWidth } : undefined}>
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Fermer">
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
