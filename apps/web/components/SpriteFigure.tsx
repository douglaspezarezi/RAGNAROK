"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { spritePath, type SpriteKind } from "@/lib/sprites";

/**
 * Lembra os sprites que já deram 404 nesta sessão, para não re-requisitar a
 * cada re-render/animação. Limpa ao recarregar a página (quando você adicionar
 * a arte, um F5 já a puxa).
 */
const failedSrcs = new Set<string>();

export interface SpriteFigureProps {
  kind: SpriteKind;
  /** jobId | monsterId | companionId — usado para o caminho do sprite real. */
  id: string;
  /** Caminho/URL explícito da arte. Se ausente, tenta `/sprites/<pasta>/<id>.png`. */
  spriteUrl?: string;
  /** Cor do placeholder quando não há imagem. */
  color: string;
  /** Glifo curto (emoji do sistema / letra) dentro do placeholder. */
  glyph?: string;
  /** Tamanho em px (lado). */
  size?: number;
  /** Espelha horizontalmente (para "olhar" na direção do inimigo). */
  flip?: boolean;
  title?: string;
}

/**
 * Renderiza um combatente: tenta a imagem real primeiro, cai no placeholder
 * (forma + cor) se o arquivo não existir — sem quebrar a tela.
 */
export function SpriteFigure({
  kind,
  id,
  spriteUrl,
  color,
  glyph,
  size = 88,
  flip = false,
  title,
}: SpriteFigureProps) {
  const src = spriteUrl ?? spritePath(kind, id);
  const [failed, setFailed] = useState(() => failedSrcs.has(src));

  useEffect(() => setFailed(failedSrcs.has(src)), [src]);

  const style: CSSProperties = {
    width: size,
    height: size,
    transform: flip ? "scaleX(-1)" : undefined,
  };

  return (
    <div className="rk-figure" style={style}>
      {failed ? (
        <PlaceholderShape kind={kind} color={color} glyph={glyph} flip={flip} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title ?? id}
          className="rk-figure-img"
          draggable={false}
          onError={() => {
            failedSrcs.add(src);
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

const SHEEN = "url(#rk-fig-sheen)";

function PlaceholderShape({
  kind,
  color,
  glyph,
  flip = false,
}: {
  kind: SpriteKind;
  color: string;
  glyph?: string;
  /** o wrapper já está espelhado; desfaz o espelho só no glifo (letra/emoji). */
  flip?: boolean;
}) {
  const shape =
    kind === "monster" ? (
      <>
        <circle cx="50" cy="50" r="46" fill={color} />
        <circle cx="50" cy="50" r="46" fill={SHEEN} />
      </>
    ) : kind === "character" ? (
      <>
        <rect x="10" y="8" width="80" height="84" rx="26" fill={color} />
        <rect x="10" y="8" width="80" height="84" rx="26" fill={SHEEN} />
      </>
    ) : (
      <>
        <polygon points="50,4 92,50 50,96 8,50" fill={color} />
        <polygon points="50,4 92,50 50,96 8,50" fill={SHEEN} />
      </>
    );

  return (
    <svg viewBox="0 0 100 100" className="rk-figure-svg" role="img" aria-hidden>
      <defs>
        <radialGradient id="rk-fig-sheen" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="65%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {shape}
      {glyph ? (
        <text
          x="50"
          y="53"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={kind === "companion" ? 34 : 42}
          transform={flip ? "translate(100 0) scale(-1 1)" : undefined}
        >
          {glyph}
        </text>
      ) : null}
    </svg>
  );
}
