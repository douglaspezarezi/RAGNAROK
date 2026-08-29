# Relatório de balanceamento — RAGNAROK

Gerado em 2026-08-29T17:49:57.789Z · `npm run simulate` (packages/game-core)

> Combate/recompensas/offline/gacha vêm de **@game/core** (inalterados). Curva de XP, ganho de atributo por nível e builds por classe são **premissas do harness** (marcadas abaixo).

## Leitura rápida (observações, não recomendações)

- **Nível não acompanha os capítulos.** Todas as 6 classes concluem os 10 capítulos em **39m 14s–57m 57s** de jogo simulado, terminando só entre **Nv 49 e Nv 63** — ~2,5× abaixo dos monstros do fim (Cap. 9–10 = Nv 100–150). Achatar a curva de XP acelerou o clear mas **não** mudou o nível final: neste modelo o personagem para de farmar assim que sobrevive ao próximo capítulo (heal ao matar + `READINESS_SAFETY = 1.3`), então o nível fica preso ao mínimo de sobrevivência, não ao XP. Levers reais: `LEVEL_UP_ATTRIBUTE_GROWTH` (menos poder por nível → mais níveis) ou dificuldade dos monstros (`MONSTER_TUNING`).
- **Dispersão entre classes: 1.5×** (mais rápida `Guerreiro` 39m 14s · mais lenta `Mercador` 57m 57s). Builds concentradas num stat de dano (FOR, DES ou AGI) são as mais rápidas; a mais lenta (Mercador) investe 40% em VIT + 40% em INT, então metade dos pontos não vira dano. Nenhuma classe travou numa parede.
- **HP nunca se sustenta sozinho.** Em todos os capítulos de todas as classes o `dano recebido/s` supera o `regen de HP/s` (razões de **14× a 34×**). A sobrevivência depende 100% do heal ao matar; sem ele o personagem morreria em quase todo monstro. Mortes reais (morrer antes de matar) por classe: **25–29** no total.
- **Offline rende 70% do jogo ativo em média** (faixa 70–70%), alvo `OFFLINE_EFFICIENCY_FACTOR` = **70%**. Calibrado: o offline deriva kills/h do DPS real do personagem, então a razão fica ≈ 70% em qualquer estágio (antes usava taxa fixa `f(nível)` e variava de ~60% a ~125%).
- **Gacha saudável.** Distribuição por tier a ≤ **0.64 p.p.** do nominal; pity respeitado (gap máximo entre Tier S = **61**, teto teórico 61). Poucos S vêm da garantia de pity — a maioria sai no sorteio.

## Constantes usadas

### De @game/core (não alteradas)

| Fonte | Constante | Valor |
| --- | --- | --- |
| character.ts | BASE_HP / HP_PER_LEVEL / HP_PER_VIT | 40 / 12 / 15 |
| character.ts | ATK_PER_FOR / ATK_PER_DES / ATK_PER_LEVEL | 2 / 1.2 / 1 |
| character.ts | MATK_PER_INT / MATK_PER_DES / MATK_PER_LEVEL | 2 / 0.3 / 1 |
| character.ts | DEF_PER_VIT / DEF_PER_LEVEL | 0.7 / 0.5 |
| character.ts | CRIT_PER_SOR | 0.3 |
| character.ts | FLEE_PER_AGI / HIT_PER_DES (+/nível) | 1 / 1 |
| character.ts | BASE_ASPD / ASPD_PER_AGI / ASPD_PER_DES / ASPD_MAX | 1 / 0.01 / 0.002 / 4 |
| character.ts | HP_REGEN_FRACTION_PER_SEC | 0.008 (× HP máx / s) |
| combat.ts | CRIT_DAMAGE_MULT / BLOCK_DAMAGE_REDUCTION / MIN_DAMAGE | 1.5 / 0.4 / 1 |
| combat.ts | HIT_RATE_FLOOR / CEIL / SOFTNESS | 0.05 / 1 / 80 |
| combat.ts | REWARD BASE_XP / XP_PER_LEVEL | 8 / 3 |
| combat.ts | REWARD BASE_GOLD / GOLD_PER_LEVEL | 5 / 4 |
| monster.ts | BASE_HP / HP_PER_LEVEL | 30 / 22 |
| monster.ts | BASE_ATK / ATK_PER_LEVEL / DEF_PER_LEVEL | 8 / 3.2 / 0.6 |
| monster.ts | BOSS_MULTIPLIER (Mini/MVP/MVP_FINAL) | 6 / 20 / 40 |
| offlineProgress.ts | OFFLINE_EFFICIENCY_FACTOR | 0.7 |
| offlineProgress.ts | OFFLINE_CAP_HOURS | 8 |
| offlineProgress.ts | kills/h offline | DPS real / HP do monstro × 3600 (clamp 60–7200) |
| gacha.ts | SUMMON_RATES (C/B/A/S) | 0.5 / 0.3 / 0.15 / 0.05 |
| gacha.ts | PITY_THRESHOLD | 60 |

### Premissas do harness (NÃO são de @game/core)

| Premissa | Valor | Origem |
| --- | --- | --- |
| Curva de XP | floor(50 + 20*nível + 1.2*nível²)  (réplica de apps/web/lib/gameSave.ts) | réplica de apps/web/lib/gameSave.ts |
| Atributo inicial (Nv 1) | 8 em cada | como o protótipo web |
| Pontos de atributo por nível | 5 (distribuídos pelo peso da classe) | harness — o protótipo web dá +5 em TODOS; aqui distribuímos pela build |
| Heal ao derrotar monstro | sim (HP cheio) | como o protótipo web |
| Folga de prontidão p/ avançar | tempoParaMorrer ≥ tempoParaMatar × 1.3 | harness |
| Critérios de parada | Nv 150 · 10 capítulos · 60d simulados · parede | harness |
| Parede (monstro) | > 30 mortes ou > 7d num único kill | harness |
| Rolls de gacha por banner | 10.000 (PRNG mulberry32, seeds 12648430 / 387605) | harness |

**Builds por classe** (peso dos 5 pontos/nível; escolhidas pela fantasia da classe, NÃO calibradas para equilibrar):

| Classe | Job base | FOR | AGI | VIT | INT | DES | SOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Guerreiro | Recruta | 0.5 | 0.2 | 0.3 | 0 | 0 | 0 |
| Arcanista | Aprendiz | 0 | 0 | 0.2 | 0.6 | 0.2 | 0 |
| Caçador | Batedor | 0.2 | 0.3 | 0 | 0 | 0.5 | 0 |
| Infiltrador | Ladino | 0.4 | 0.6 | 0 | 0 | 0 | 0 |
| Mercador | Negociante | 0 | 0 | 0.4 | 0.4 | 0.2 | 0 |
| Acólito | Noviço | 0.6 | 0 | 0.3 | 0.1 | 0 | 0 |

> Nota do modelo: o combate resolve dano físico por `ATK_PER_FOR·FOR + ATK_PER_DES·DES` (FOR vale 4× DES por ponto) e mágico por `MATK_PER_INT·INT`. `attackType` é mágico quando INT efetivo > FOR efetivo. Os jobs base (tier 1) não têm `attributeFocus`, então a linha de classe só influencia via `attackType` — toda a diferença entre classes vem da build de atributos.

## 1. Progressão principal (Nv 1 → parada)

### Resumo por classe

| Classe | Nível final | Caps. concluídos | Tempo simulado total | Mortes | Parada |
| --- | --- | --- | --- | --- | --- |
| Guerreiro | 49 | 10 / 10 | 39m 14s | 25 | concluiu os 10 capítulos |
| Arcanista | 58 | 10 / 10 | 48m 5s | 26 | concluiu os 10 capítulos |
| Caçador | 63 | 10 / 10 | 43m 6s | 29 | concluiu os 10 capítulos |
| Infiltrador | 59 | 10 / 10 | 40m 48s | 29 | concluiu os 10 capítulos |
| Mercador | 53 | 10 / 10 | 57m 57s | 28 | concluiu os 10 capítulos |
| Acólito | 55 | 10 / 10 | 49m 57s | 27 | concluiu os 10 capítulos |

**Dispersão entre classes:** mais rápida = `Guerreiro` (39m 14s), mais lenta = `Mercador` (57m 57s) → **1.5×**. Um fator próximo de 1× indica classes parelhas; acima de ~2× já é candidato a ajuste.

### Detalhe por capítulo

#### Guerreiro

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 3s | 2 | 0 | 11 | 19.4× |  |
| 2 | Esgotos de Aurelis | 4 | 9 | 2m 8s | 5 | 18 | 24 | 21.0× |  |
| 3 | Florestas de Sylmere | 9 | 16 | 4m 3s | 4 | 32 | 38 | 19.1× |  |
| 4 | Torre Arcana | 16 | 20 | 2m 51s | 3 | 17 | 23 | 17.1× |  |
| 5 | Colinas de Kaeshin | 20 | 24 | 3m 11s | 2 | 21 | 26 | 16.6× |  |
| 6 | Caverna de Kaeshin | 24 | 28 | 3m 27s | 2 | 23 | 28 | 17.3× |  |
| 7 | Dunas de Zahkar | 28 | 34 | 5m 40s | 2 | 44 | 49 | 17.0× |  |
| 8 | Pirâmide Esquecida | 34 | 40 | 6m 12s | 2 | 49 | 54 | 17.8× |  |
| 9 | Costa de Ventomar | 40 | 49 | 10m 10s | 2 | 90 | 95 | 18.4× |  |
| 10 | Navio Naufragado | 49 | 49 | 29s | 1 | 0 | 4 | 17.0× |  |

#### Arcanista

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 9s | 3 | 0 | 11 | 21.0× |  |
| 2 | Esgotos de Aurelis | 4 | 10 | 2m 35s | 5 | 27 | 33 | 24.2× |  |
| 3 | Florestas de Sylmere | 10 | 17 | 3m 50s | 4 | 36 | 42 | 22.2× |  |
| 4 | Torre Arcana | 17 | 22 | 3m 22s | 4 | 27 | 33 | 21.7× |  |
| 5 | Colinas de Kaeshin | 22 | 27 | 3m 46s | 2 | 33 | 38 | 20.8× |  |
| 6 | Caverna de Kaeshin | 27 | 32 | 4m 13s | 2 | 38 | 43 | 21.3× |  |
| 7 | Dunas de Zahkar | 32 | 40 | 7m 41s | 2 | 79 | 84 | 20.7× |  |
| 8 | Pirâmide Esquecida | 40 | 47 | 7m 34s | 2 | 78 | 83 | 21.2× |  |
| 9 | Costa de Ventomar | 47 | 58 | 13m 30s | 2 | 150 | 155 | 22.2× |  |
| 10 | Navio Naufragado | 58 | 58 | 24s | 0 | 0 | 4 | 20.5× |  |

#### Caçador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 2s | 3 | 0 | 11 | 24.5× |  |
| 2 | Esgotos de Aurelis | 4 | 12 | 3m 17s | 7 | 47 | 53 | 30.6× |  |
| 3 | Florestas de Sylmere | 12 | 21 | 4m 59s | 4 | 67 | 73 | 29.1× |  |
| 4 | Torre Arcana | 21 | 27 | 3m 56s | 4 | 49 | 55 | 30.3× |  |
| 5 | Colinas de Kaeshin | 27 | 32 | 3m 31s | 2 | 46 | 51 | 27.9× |  |
| 6 | Caverna de Kaeshin | 32 | 37 | 3m 47s | 2 | 51 | 56 | 29.9× |  |
| 7 | Dunas de Zahkar | 37 | 45 | 6m 26s | 2 | 99 | 104 | 30.2× |  |
| 8 | Pirâmide Esquecida | 45 | 53 | 6m 52s | 2 | 112 | 117 | 32.3× |  |
| 9 | Costa de Ventomar | 53 | 63 | 9m | 2 | 162 | 167 | 33.8× |  |
| 10 | Navio Naufragado | 63 | 63 | 15s | 1 | 0 | 4 | 33.0× |  |

#### Infiltrador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 5s | 3 | 0 | 11 | 23.9× |  |
| 2 | Esgotos de Aurelis | 4 | 12 | 3m 31s | 7 | 47 | 53 | 29.3× |  |
| 3 | Florestas de Sylmere | 12 | 20 | 4m 42s | 4 | 56 | 62 | 26.4× |  |
| 4 | Torre Arcana | 20 | 26 | 4m 4s | 4 | 45 | 51 | 27.9× |  |
| 5 | Colinas de Kaeshin | 26 | 31 | 3m 40s | 2 | 44 | 49 | 25.0× |  |
| 6 | Caverna de Kaeshin | 31 | 35 | 3m 3s | 2 | 36 | 41 | 26.6× |  |
| 7 | Dunas de Zahkar | 35 | 43 | 6m 26s | 2 | 90 | 95 | 27.4× |  |
| 8 | Pirâmide Esquecida | 43 | 49 | 5m 9s | 2 | 74 | 79 | 28.8× |  |
| 9 | Costa de Ventomar | 49 | 59 | 8m 52s | 2 | 143 | 148 | 31.3× |  |
| 10 | Navio Naufragado | 59 | 59 | 16s | 1 | 0 | 4 | 29.8× |  |

#### Mercador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 17s | 3 | 0 | 11 | 18.2× |  |
| 2 | Esgotos de Aurelis | 4 | 10 | 3m 13s | 5 | 27 | 33 | 19.2× |  |
| 3 | Florestas de Sylmere | 10 | 16 | 4m 21s | 4 | 28 | 34 | 15.6× |  |
| 4 | Torre Arcana | 16 | 21 | 4m 27s | 4 | 24 | 30 | 15.3× |  |
| 5 | Colinas de Kaeshin | 21 | 25 | 4m 8s | 2 | 23 | 28 | 14.1× |  |
| 6 | Caverna de Kaeshin | 25 | 30 | 5m 45s | 3 | 34 | 39 | 14.8× |  |
| 7 | Dunas de Zahkar | 30 | 37 | 8m 55s | 2 | 59 | 64 | 14.0× |  |
| 8 | Pirâmide Esquecida | 37 | 44 | 10m 19s | 2 | 69 | 74 | 14.4× |  |
| 9 | Costa de Ventomar | 44 | 53 | 14m 53s | 2 | 105 | 110 | 14.7× |  |
| 10 | Navio Naufragado | 53 | 53 | 38s | 1 | 0 | 4 | 13.8× |  |

#### Acólito

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 1s | 2 | 0 | 11 | 19.7× |  |
| 2 | Esgotos de Aurelis | 4 | 9 | 2m 1s | 5 | 18 | 24 | 21.6× |  |
| 3 | Florestas de Sylmere | 9 | 16 | 3m 54s | 4 | 32 | 38 | 20.2× |  |
| 4 | Torre Arcana | 16 | 21 | 3m 37s | 4 | 25 | 31 | 18.6× |  |
| 5 | Colinas de Kaeshin | 21 | 25 | 3m 11s | 2 | 22 | 27 | 17.3× |  |
| 6 | Caverna de Kaeshin | 25 | 30 | 4m 38s | 3 | 34 | 39 | 18.3× |  |
| 7 | Dunas de Zahkar | 30 | 37 | 7m 15s | 2 | 59 | 64 | 17.4× |  |
| 8 | Pirâmide Esquecida | 37 | 45 | 9m 44s | 2 | 81 | 86 | 18.0× |  |
| 9 | Costa de Ventomar | 45 | 55 | 14m 5s | 2 | 124 | 129 | 17.9× |  |
| 10 | Navio Naufragado | 55 | 55 | 31s | 1 | 0 | 4 | 16.7× |  |

> "Monstros HP-negativo" = monstros em que `dano recebido/s > regen de HP/s` — o personagem só sobrevive porque cura ao matar; "Pior dano/regen" é a razão mais extrema vista no capítulo. "Mortes" só acontecem quando o personagem morre ANTES de matar o monstro (HP cheio não aguenta o `ttk`).

## 2. Progresso offline vs. jogo ativo

Personagem de referência: **Caçador** (snapshots tirados quando o nível cruza 20, 50, 70). "Ativo" = kills reais/s do combate (`simulateCombatTick`) × recompensa por kill. "Offline" = `calculateOfflineRewards`, que agora deriva kills/h do DPS real do personagem no estágio (`DPS / HP_do_monstro × 3600`) e aplica `OFFLINE_EFFICIENCY_FACTOR = 0.7` — então a razão deve ficar ≈ 70% por construção.

| Nível | Estágio (monstro) | Janela | XP offline | XP ativo | Ouro offline | Ouro ativo | Offline/Ativo (XP) | Offline/Ativo (Ouro) | Kills off vs ativo | net HP/s no estágio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Espinho Vagante (Nv 39) | 1h | 62.695 | 89.564 | 80.751 | 115.359 | 70% | 70% | 502 vs 717 | -61.3 |
| 20 | Espinho Vagante (Nv 39) | 4h | 250.780 | 358.257 | 323.004 | 461.435 | 70% | 70% | 2.006 vs 2.866 | -61.3 |
| 20 | Espinho Vagante (Nv 39) | 8h | 501.559 | 716.514 | 646.009 | 922.869 | 70% | 70% | 4.012 vs 5.732 | -61.3 |
| 50 | Espectro Dourado (Nv 101) | 1h | 190.463 | 272.090 | 250.480 | 357.829 | 70% | 70% | 612 vs 875 | -166.4 |
| 50 | Espectro Dourado (Nv 101) | 4h | 761.851 | 1.088.359 | 1.001.920 | 1.431.314 | 70% | 70% | 2.450 vs 3.500 | -166.4 |
| 50 | Espectro Dourado (Nv 101) | 8h | 1.523.702 | 2.176.717 | 2.003.840 | 2.862.628 | 70% | 70% | 4.899 vs 6.999 | -166.4 |

**Proporção offline/ativo (XP) média: 70%.** Alvo = `OFFLINE_EFFICIENCY_FACTOR` (70%). Como o offline agora usa o mesmo DPS do combate, a razão fica ≈ 70%; o resíduo que sobra vem de o "ativo" deste relatório descontar tempo de mortes (coluna "net HP/s"), enquanto o offline assume 0 mortes.

## 3. Gacha

10.000 `rollSummon` por banner, com pity encadeado. Taxas nominais (GDD §8.2 / `SUMMON_RATES`): C 50% · B 30% · A 15% · S 5%. Pity: Tier S garantido quando o contador atinge 60 (gap máximo teórico entre S = 61).

### Banner `companion` (seed 12648430)

| Tier | Contagem | Observado | Nominal | Δ (p.p.) |
| --- | --- | --- | --- | --- |
| C | 5.002 | 50.02% | 50.00% | 0.02 |
| B | 2.963 | 29.63% | 30.00% | -0.37 |
| A | 1.506 | 15.06% | 15.00% | 0.06 |
| S | 529 | 5.29% | 5.00% | 0.29 |

| Métrica | Valor |
| --- | --- |
| Tier S no total | 529 / 10.000 |
| S por garantia de pity | 25 (4.7% dos S) |
| 1ª invocação até um S | 13 |
| Gap entre S — média | 18.9 |
| Gap entre S — mediana | 14 |
| Gap entre S — mín / máx | 1 / 61 |
| Gap entre S — p95 | 60 |
| Gap máximo teórico (pity) | 61 |
| Pity respeitado? | ✅ sim |

### Banner `seal` (seed 387605)

| Tier | Contagem | Observado | Nominal | Δ (p.p.) |
| --- | --- | --- | --- | --- |
| C | 5.023 | 50.23% | 50.00% | 0.23 |
| B | 2.936 | 29.36% | 30.00% | -0.64 |
| A | 1.524 | 15.24% | 15.00% | 0.24 |
| S | 517 | 5.17% | 5.00% | 0.17 |

| Métrica | Valor |
| --- | --- |
| Tier S no total | 517 / 10.000 |
| S por garantia de pity | 27 (5.2% dos S) |
| 1ª invocação até um S | 40 |
| Gap entre S — média | 19.3 |
| Gap entre S — mediana | 13 |
| Gap entre S — mín / máx | 1 / 61 |
| Gap entre S — p95 | 61 |
| Gap máximo teórico (pity) | 61 |
| Pity respeitado? | ✅ sim |

> Gap médio esperado sem pity ≈ 1 / P(S) = 1 / 0.05 = 20. O pity encurta a cauda: nenhum gap deve passar de 61. Os dois banners usam a mesma lógica de tier em `rollSummon` (só o pool de itens muda), então as distribuições devem bater entre si a menos de ruído de RNG.

---
_Arquivos irmãos: `progression.csv`, `gacha.csv`._
