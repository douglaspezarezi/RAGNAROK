import type { CSSProperties } from "react";

import type { Monster } from "@game/data";

import { arenaBackground, elementColor } from "@/lib/sprites";

export interface Floater {
  id: number;
  side: "hero" | "monster";
  kind: "dmg" | "taken" | "info" | "level" | "defeat";
  text: string;
  /** deslocamento horizontal aleatório (px) para não empilhar */
  dx: number;
}

export interface BattleArenaProps {
  chapterNumber: number;
  chapterLabel: string;

  heroEmoji: string;
  heroName: string;
  heroLine?: string;
  heroLevel: number;
  heroHp: number;
  heroMaxHp: number;
  heroSp: number;
  heroMaxSp: number;

  xp: number;
  xpMax: number;
  gold: number;

  monster: Monster;
  monsterEmoji: string;
  monsterHp: number;
  monsterMaxHp: number;

  /** incrementa a cada tick de combate — força o replay das animações */
  fxTick: number;
  heroHurt: boolean;
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
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-semibold text-white/80">
        <span>{label}</span>
        <span>
          {Math.max(0, Math.ceil(value))}/{max}
        </span>
      </div>
      <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full border border-white/20 bg-black/40">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct(value, max)}%`, background: fill }}
        />
      </div>
    </div>
  );
}

export function BattleArena(props: BattleArenaProps) {
  const {
    chapterNumber,
    chapterLabel,
    heroEmoji,
    heroName,
    heroLine,
    heroLevel,
    heroHp,
    heroMaxHp,
    heroSp,
    heroMaxSp,
    xp,
    xpMax,
    gold,
    monster,
    monsterEmoji,
    monsterHp,
    monsterMaxHp,
    fxTick,
    heroHurt,
    monsterHit,
    floaters,
    paused,
  } = props;

  return (
    <div
      className="rk-arena"
      style={{ background: arenaBackground(chapterNumber) }}
    >
      <div className="rk-chapter">
        Cap. {chapterNumber} — {chapterLabel}
      </div>

      <div className="rk-floor" />

      {/* ---- herói ---- */}
      <div className="rk-slot rk-slot-hero">
        <Meter label="HP" value={heroHp} max={heroMaxHp} fill="#22c55e" />
        <Meter label="SP" value={heroSp} max={heroMaxSp} fill="#38bdf8" />
        <div className="rk-sprite-wrap">
          <div key={fxTick} className="rk-sprite rk-swing">
            <span className={heroHurt ? "rk-hurt" : undefined}>{heroEmoji}</span>
          </div>
          <div className="rk-shadow" />
        </div>
        <div className="rk-name">
          {heroName}
          {heroLine ? <span className="rk-sub"> · {heroLine}</span> : null} · Nv{" "}
          {heroLevel}
        </div>
      </div>

      {/* ---- monstro ---- */}
      <div className="rk-slot rk-slot-monster">
        <Meter label="HP" value={monsterHp} max={monsterMaxHp} fill="#ef4444" />
        <div
          className={monster.isBoss ? "rk-sprite-wrap rk-boss" : "rk-sprite-wrap"}
        >
          <div
            className="rk-aura"
            style={{
              background: `radial-gradient(circle, ${elementColor(
                monster.element,
              )}55, transparent 70%)`,
            }}
          />
          <div
            key={monster.id}
            className="rk-enter"
            style={{ transform: monster.isBoss ? "scale(1.25)" : undefined }}
          >
            <div
              key={fxTick}
              className={monsterHit ? "rk-sprite rk-shake" : "rk-sprite"}
            >
              {monsterEmoji}
            </div>
          </div>
          <div className="rk-shadow" />
        </div>
        <div className="rk-name">
          {monster.name} · Nv {monster.level}
          {monster.isBoss ? (
            <span className="rk-badge">{monster.bossRank}</span>
          ) : null}
        </div>
        <div className="rk-tags">
          {monster.race} · {monster.element} {monster.elementLevel} ·{" "}
          {monster.size}
        </div>
      </div>

      {/* ---- números flutuantes ---- */}
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

      {/* ---- faixa inferior: XP + ouro ---- */}
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
