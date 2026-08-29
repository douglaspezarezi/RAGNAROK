"use client";

/**
 * Notificações in-game — fila de toasts, cada uma some sozinha depois de alguns
 * segundos. Ponto único para qualquer parte do app disparar um aviso sem
 * duplicar UI: `useNotifications()` (hook) ou o objeto `toast` (imperativo).
 *
 * Usos: conquista desbloqueada, erro ao salvar progresso, evento terminando,
 * invocação rara (Tier S), avisos gerais.
 *
 * O nome do arquivo continua `toast` por compatibilidade com os imports
 * existentes (`import { toast } from "@/lib/toast"`).
 */

import { useSyncExternalStore } from "react";

export type ToastKind =
  | "error"
  | "info"
  | "success"
  | "achievement"
  | "event"
  | "summon";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DEFAULT_TTL_MS = 5000;

const TTL_BY_KIND: Partial<Record<ToastKind, number>> = {
  error: 7000,
  achievement: 6500,
  summon: 6500,
};

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Enfileira uma notificação. Retorna o id (para `dismiss` manual). */
export function notify(
  kind: ToastKind,
  message: string,
  ttlMs = TTL_BY_KIND[kind] ?? DEFAULT_TTL_MS,
): number {
  const id = ++seq;
  toasts = [...toasts, { id, kind, message }].slice(-5);
  emit();
  if (ttlMs > 0 && typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), ttlMs);
  }
  return id;
}

export function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Atalhos imperativos (retrocompatível com o uso anterior de `toast`). */
export const toast = {
  error: (message: string) => notify("error", message),
  info: (message: string) => notify("info", message),
  success: (message: string) => notify("success", message),
  achievement: (message: string) => notify("achievement", message),
  event: (message: string) => notify("event", message),
  summon: (message: string) => notify("summon", message),
};

/**
 * Hook central de notificações. `notify(kind, message)` dispara; `dismiss(id)`
 * remove antes da hora. A UI é o `<Toaster />` montado no `AppShell`.
 */
export function useNotifications(): {
  notify: typeof notify;
  dismiss: typeof dismiss;
} {
  return { notify, dismiss };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Toast[] {
  return toasts;
}

const EMPTY: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

const KIND_STYLE: Record<ToastKind, string> = {
  error: "border-red-500/40 bg-red-950/90 text-red-100",
  info: "border-neutral-500/40 bg-neutral-900/90 text-neutral-100",
  success: "border-emerald-500/40 bg-emerald-950/90 text-emerald-100",
  achievement: "border-amber-500/50 bg-amber-950/90 text-amber-100",
  event: "border-sky-500/40 bg-sky-950/90 text-sky-100",
  summon: "border-fuchsia-500/50 bg-fuchsia-950/90 text-fuchsia-100",
};

const KIND_PREFIX: Record<ToastKind, string> = {
  error: "⚠️",
  info: "",
  success: "✓",
  achievement: "🏆",
  event: "📅",
  summon: "✨",
};

export function Toaster() {
  const items = useToasts();
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,340px)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur ${KIND_STYLE[t.kind]}`}
          role={t.kind === "error" ? "alert" : "status"}
        >
          {KIND_PREFIX[t.kind] ? (
            <span aria-hidden>{KIND_PREFIX[t.kind]}</span>
          ) : null}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
