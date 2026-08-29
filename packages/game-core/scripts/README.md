# Harness de simulação de balanceamento

Script standalone que simula partidas e mede a curva de progressão, o progresso
offline e o gacha — **sem UI, sem Supabase**. Não altera nenhuma fórmula de
`@game/core`; só lê, simula e reporta.

## Rodar

```bash
npm run simulate --workspace @game/core
# ou, de dentro de packages/game-core:
npm run simulate
# ou direto:
npx tsx packages/game-core/scripts/simulate.ts
```

## Saídas (em `scripts/output/`)

| Arquivo | Conteúdo |
|---|---|
| `balance-report.md` | relatório legível: leitura rápida, constantes usadas, progressão por classe/capítulo, offline vs ativo, gacha |
| `progression.csv` | uma linha por classe × capítulo (tempo simulado, mortes, kills de farm, razão dano/regen…) |
| `gacha.csv` | distribuição por tier observada vs nominal, por banner |

O mesmo relatório também é impresso no console.

## O que é "verdade" e o que é premissa

- **De `@game/core` (inalterado):** combate (`simulateCombatTick`), recompensas
  (`resolveMonsterDefeat`), offline (`calculateOfflineRewards`), gacha
  (`rollSummon`) e todas as constantes de tuning.
- **Premissas do harness** (topo de `simulate.ts`, bloco `CONFIG` + `CLASS_BUILDS`):
  curva de XP e ganho de atributo por nível (replicados de
  `apps/web/lib/gameSave.ts`, pois `@game/core` ainda não os tem), builds de
  atributo por classe (escolhidas pela fantasia da classe, **não** calibradas
  para equilibrar), política de farm e critérios de parada.

Todas as premissas aparecem numa tabela no início do relatório para rastrear a
origem de qualquer número.
