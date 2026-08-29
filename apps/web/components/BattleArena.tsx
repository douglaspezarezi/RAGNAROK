import type { CSSProperties } from "react";

import { arenaBackground } from "@/lib/sprites";
import { SpriteFigure, type SpriteFigureProps } from "./SpriteFigure";

export interface Floater {
  id: number;
  side: "hero" | "monster";
  kind: "dmg" | "taken" | "info" | "level" | "defeat";
  text: string;
  /** deslocamento horizontal aleatório (px) para não empilhar */
  dx: number;
}

/** Um combatente na cena (dados de render — nada de regras). */
export interface Combatant {
  sprite: Pick<SpriteFigureProps, "kind" | "id" | "spriteUrl" | "color" | "glyph">;
  name: string;
  /** linha abaixo do nome (ex.: "Guerreiro · Nv 12" ou "Nv 4 · Inseto · Terra 1"). */
  sub?: string;
  hp?: number;
  maxHp?: number;
  sp?: number;
  maxSp?: number;
  /** só monstro */
  isBoss?: boolean;
  bossRank?: string;
  /** cor da aura atrás do monstro (por elemento) */
  auraColor?: string;
}

export interface BattleArenaProps {
  chapterNumber: number;
  chapterLabel: string;

  hero: Combatant;
  companion: Combatant | null;
  monster: Combatant;
  /** monstro em fade-out de morte (mostra o que caiu até o próximo entrar). */
  monsterDying: boolean;

  xp: number;
  xpMax: number;
  gold: number;

  /** incrementa a cada tick — usado como key para re-disparar animações. */
  fxTick: number;
  heroAttack: boolean;
  heroHurt: boolean;
  companionAttack: boolean;
  monsterHit: boolean;

  floaters: Floater[];
  paused: boolean;
}

function pct(value: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
}

function Meter({
  label,
  value,
  max,
  fill,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
}) {
  return (
    <div className="rk-meter">
      <div className="rk-meter-row">
        <span>{label}</span>
        <span>
          {Math.max(0, Math.ceil(value))}/{max}
        </span>
      </div>
      <div className="rk-meter-track">
        <div className="rk-meter-fill" style={{ width: `${pct(value, max)}%`, background: fill }} />
      </div>
    </div>
  );
}

export function BattleArena({
  chapterNumber,
  chapterLabel,
  hero,
  companion,
  monster,
  monsterDying,
  xp,
  xpMax,
  gold,
  fxTick,
  heroAttack,
  heroHurt,
  companionAttack,
  monsterHit,
  floaters,
  paused,
}: BattleArenaProps) {
  return (
    <div className="rk-arena" style={{ background: arenaBackground(chapterNumber) }}>
      <div className="rk-chapter">
        Cap. {chapterNumber} — {chapterLabel}
      </div>
      <div className="rk-floor" />

      <div className="rk-stage">
        {/* ---------- grupo do jogador (personagem + companheiro) ---------- */}
        <div className="rk-party">
          {companion ? (
            <div className="rk-combatant rk-combatant-companion">
              <div className="rk-figure-wrap">
                <div
                  key={fxTick}
                  className={companionAttack ? "rk-anim rk-cast" : "rk-anim"}
                >
                  <SpriteFigure {...companion.sprite} size={54} flip title={companion.name} />
                </div>
                <div className="rk-shadow rk-shadow-sm" />
              </div>
              <div className="rk-cname rk-cname-sm" title={companion.sub}>
                {companion.name}
              </div>
            </div>
          ) : null}

          <div className="rk-combatant rk-combatant-hero">
            <div className="rk-bars">
              <Meter label="HP" value={hero.hp ?? 0} max={hero.maxHp ?? 1} fill="#22c55e" />
              <Meter label="SP" value={hero.sp ?? 0} max={hero.maxSp ?? 1} fill="#38bdf8" />
            </div>
            <div className="rk-figure-wrap">
              <div
                key={fxTick}
                className={heroAttack ? "rk-anim rk-swing" : "rk-anim"}
              >
                <div className={heroHurt ? "rk-anim rk-hurt" : "rk-anim"}>
                  <SpriteFigure {...hero.sprite} size={92} flip title={hero.name} />
                </div>
              </div>
              <div className="rk-shadow" />
            </div>
            <div className="rk-cname">{hero.name}</div>
            {hero.sub ? <div className="rk-ctags">{hero.sub}</div> : null}
          </div>
        </div>

        {/* ---------- monstro ---------- */}
        <div className={`rk-combatant rk-combatant-monster ${monster.isBoss ? "rk-boss" : ""}`}>
          <div className="rk-bars">
            <Meter
              label="HP"
              value={monster.hp ?? 0}
              max={monster.maxHp ?? 1}
              fill="#ef4444"
            />
          </div>
          <div className="rk-figure-wrap">
            <div
              className="rk-aura"
              style={{
                background: `radial-gradient(circle, ${monster.auraColor ?? "#9ca3af"}55, transparent 70%)`,
              }}
            />
            <div
              key={monster.sprite.id}
              className={monsterDying ? "rk-anim rk-death" : "rk-anim rk-enter"}
            >
              <div
                key={fxTick}
                className={monsterHit ? "rk-anim rk-monster-hit" : "rk-anim"}
              >
                <SpriteFigure {...monster.sprite} size={96} title={monster.name} />
              </div>
            </div>
            <div className="rk-shadow" />
          </div>
          <div className="rk-cname">
            {monster.name}
            {monster.isBoss && monster.bossRank ? (
              <span className="rk-badge">{monster.bossRank}</span>
            ) : null}
          </div>
          {monster.sub ? <div className="rk-ctags">{monster.sub}</div> : null}
        </div>
      </div>

      {/* ---------- números flutuantes ---------- */}
      <div className="rk-floaters">
        {floaters.map((f) => (
          <span
            key={f.id}
            className={`rk-floater rk-floater-${f.kind} ${
              f.side === "hero" ? "rk-floater-hero" : "rk-floater-monster"
            }`}
            style={{ "--dx": `${f.dx}px` } as CSSProperties}
          >
            {f.text}
          </span>
        ))}
      </div>

      {/* ---------- faixa inferior: XP + ouro ---------- */}
      <div className="rk-strip">
        <span className="rk-strip-label">XP</span>
        <div className="rk-xpbar">
          <div style={{ width: `${pct(xp, xpMax)}%` }} />
        </div>
        <span className="rk-strip-label">
          {Math.floor(xp)}/{xpMax}
        </span>
        <span className="rk-strip-gold">🪙 {gold}</span>
      </div>

      {paused ? <div className="rk-arena-paused">PAUSADO</div> : null}
    </div>
  );
}
