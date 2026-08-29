# RAGNAROK — Idle RPG (monorepo)

Idle RPG em TypeScript ambientado no Continente de Elyndor. Documento de design:
[`docs/GDD.md`](docs/GDD.md) — **fonte da verdade** para todos os nomes e valores.

## Estrutura

```
apps/
  web/                 App Next.js (App Router, TypeScript, Tailwind CSS v4)
packages/
  game-core/  @game/core   Lógica pura do jogo (combate, sistemas de idle) — sem UI
  game-data/  @game/data   Dados estruturados e tipados (bestiário, classes, selos, companheiros)
```

Monorepo com **npm workspaces**. O `apps/web` importa os pacotes via workspace
(`@game/core`, `@game/data`) — os pacotes são consumidos como TypeScript-fonte
e transpilados pelo Next (`transpilePackages` em `apps/web/next.config.ts`).

## Scripts (na raiz)

| Comando | Efeito |
|---|---|
| `npm run dev` | Sobe o `apps/web` em modo dev |
| `npm run build` | Build de todos os workspaces (`next build` + `tsc --noEmit`) |
| `npm run typecheck` | Typecheck de todos os workspaces |
| `npm run typecheck:data` | Só o `@game/data` |
| `npm run typecheck:core` | Só o `@game/core` |

## `@game/data` — dados do jogo

Tudo tipado em `packages/game-data/src/`:

- `types.ts` — interfaces centrais: `Monster`, `JobClass`, `BattleSeal`, `Companion` (+ tipos auxiliares).
- `bestiary.ts` — `MONSTERS` (69 monstros das 10 regiões) + `BOSSES`, `CHAPTERS`. Chefes têm `isBoss: true` e `bossRank: "Mini" | "MVP"`.
- `classes.ts` — `JOBS` (6 linhas × 2 caminhos × Job 1→4 = 42 jobs) encadeados por `previousJobId`.
- `battleSeals.ts` — `BATTLE_SEALS` (45 selos nas 7 categorias de equipamento). `sourceMonsterId` é validado contra o bestiário em tempo de compilação (tipo `MonsterId`).
- `companions.ts` — `COMPANIONS` (15 companheiros nos tiers S/A/B/C).
- `index.ts` — reexporta tudo + índices `*_BY_ID`.

Nenhuma lógica de combate ou de UI vive neste pacote — só dados e tipos.
