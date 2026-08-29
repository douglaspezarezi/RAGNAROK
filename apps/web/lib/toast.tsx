"use client";

/**
 * Sistema de toast mínimo (sem dependências). Usado principalmente para avisar
 * erros de rede/Supabase — o jogador não pode perder progresso em silêncio.
 */

import { useSyncExternalStore } from "react";

export type ToastKind = "error" | "info" | "success";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DEFAULT_TTL_MS = 5000;

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function push(kind: ToastKind, message: string, ttlMs = DEFAULT_TTL_MS): number {
  const id = ++seq;
  toasts = [...toasts, { id, kind, message }].slice(-4);
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

export const toast = {
  error: (message: string) => push("error", message, 7000),
  info: (message: string) => push("info", message),
  success: (message: string) => push("success", message),
};

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
