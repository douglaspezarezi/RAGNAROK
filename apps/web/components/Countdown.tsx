"use client";

import { useEffect, useState } from "react";

/** Formata um intervalo em ms como "2d 4h 13m 07s" (omite unidades zeradas à esquerda). */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "encerrado";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  if (d > 0 || h > 0 || m > 0) parts.push(`${m}m`);
  parts.push(`${String(s).padStart(2, "0")}s`);
  return parts.join(" ");
}

/**
 * Contador regressivo até `target` (ISO string ou epoch ms). Atualiza a cada
 * segundo. Chama `onExpire` uma vez ao cruzar o zero.
 */
export function Countdown({
  target,
  prefix = "Termina em ",
  onExpire,
  className,
}: {
  target: string | number;
  prefix?: string;
  onExpire?: () => void;
  className?: string;
}) {
  const targetMs =
    typeof target === "number" ? target : new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = targetMs - now;
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired) onExpire?.();
    // dispara só na virada para expirado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  return (
    <span className={className}>
      {expired ? "Encerrado" : `${prefix}${formatRemaining(remaining)}`}
    </span>
  );
}
