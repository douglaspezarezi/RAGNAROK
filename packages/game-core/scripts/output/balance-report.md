# Relatório de balanceamento — RAGNAROK

Gerado em 2026-08-29T17:20:44.784Z · `npm run simulate` (packages/game-core)

> Combate/recompensas/offline/gacha vêm de **@game/core** (inalterados). Curva de XP, ganho de atributo por nível e builds por classe são **premissas do harness** (marcadas abaixo).

## Leitura rápida (observações, não recomendações)

- **Progressão rápida demais em relação à curva de nível.** Todas as 6 classes concluem os 10 capítulos em **1h 2m–3h 19m** de jogo simulado, terminando entre **Nv 50 e Nv 73**. O critério "Nv 150" nunca é atingido: os capítulos acabam muito antes, e o personagem fica bem abaixo do nível dos monstros do fim (Cap. 9–10 têm monstros Nv 100–150).
- **Dispersão entre classes: 3.2×** (mais rápida `Guerreiro` 1h 2m · mais lenta `Acólito` 3h 19m). Builds físicas puras (FOR) são as mais rápidas; builds baseadas em DES/INT/VIT rendem menos dano por ponto neste modelo. Nenhuma classe travou numa parede.
- **HP nunca se sustenta sozinho.** Em todos os capítulos de todas as classes o `dano recebido/s` supera o `regen de HP/s` (razões de **40× a 114×**). A sobrevivência depende 100% do heal ao matar; sem ele o personagem morreria em quase todo monstro. Mortes reais (morrer antes de matar) por classe: **22–37** no total.
- **Offline rende 86% do jogo ativo em média** (faixa 61–123%), contra o alvo de `OFFLINE_EFFICIENCY_FACTOR` = **70%**. O modelo offline usa uma taxa fixa de kills/hora que não acompanha a dificuldade real do estágio, então superestima em alvos de HP alto e subestima em alvos fracos.
- **Gacha saudável.** Distribuição por tier a ≤ **0.64 p.p.** do nominal; pity respeitado (gap máximo entre Tier S = **61**, teto teórico 61). Poucos S vêm da garantia de pity — a maioria sai no sorteio.

## Constantes usadas

### De @game/core (não alteradas)

| Fonte | Constante | Valor |
| --- | --- | --- |
| character.ts | BASE_HP / HP_PER_LEVEL / HP_PER_VIT | 40 / 12 / 15 |
| character.ts | ATK_PER_FOR / ATK_PER_DES / ATK_PER_LEVEL | 2 / 0.5 / 1 |
| character.ts | MATK_PER_INT / MATK_PER_DES / MATK_PER_LEVEL | 2 / 0.3 / 1 |
| character.ts | DEF_PER_VIT / DEF_PER_LEVEL | 0.7 / 0.5 |
| character.ts | CRIT_PER_SOR | 0.3 |
| character.ts | FLEE_PER_AGI / HIT_PER_DES (+/nível) | 1 / 1 |
| character.ts | BASE_ASPD / ASPD_PER_AGI / ASPD_PER_DES / ASPD_MAX | 1 / 0.01 / 0.002 / 4 |
| character.ts | HP_REGEN_FRACTION_PER_SEC | 0.002 (× HP máx / s) |
| combat.ts | CRIT_DAMAGE_MULT / BLOCK_DAMAGE_REDUCTION / MIN_DAMAGE | 1.5 / 0.4 / 1 |
| combat.ts | HIT_RATE_FLOOR / CEIL / SOFTNESS | 0.05 / 1 / 80 |
| combat.ts | REWARD BASE_XP / XP_PER_LEVEL | 8 / 6 |
| combat.ts | REWARD BASE_GOLD / GOLD_PER_LEVEL | 5 / 4 |
| monster.ts | BASE_HP / HP_PER_LEVEL | 30 / 22 |
| monster.ts | BASE_ATK / ATK_PER_LEVEL / DEF_PER_LEVEL | 8 / 3.2 / 0.6 |
| monster.ts | BOSS_MULTIPLIER (Mini/MVP/MVP_FINAL) | 6 / 20 / 40 |
| offlineProgress.ts | OFFLINE_EFFICIENCY_FACTOR | 0.7 |
| offlineProgress.ts | OFFLINE_CAP_HOURS | 8 |
| offlineProgress.ts | KILLS_PER_HOUR_BASE / _LEVEL_PENALTY / MIN | 900 / 1.5 / 60 |
| gacha.ts | SUMMON_RATES (C/B/A/S) | 0.5 / 0.3 / 0.15 / 0.05 |
| gacha.ts | PITY_THRESHOLD | 60 |

### Premissas do harness (NÃO são de @game/core)

| Premissa | Valor | Origem |
| --- | --- | --- |
| Curva de XP | floor(50 + 25*nível + 5*nível²)  (réplica de apps/web/lib/gameSave.ts) | réplica de apps/web/lib/gameSave.ts |
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
| Infiltrador | Ladino | 0.3 | 0.35 | 0 | 0 | 0 | 0.35 |
| Mercador | Negociante | 0 | 0 | 0.4 | 0.4 | 0.2 | 0 |
| Acólito | Noviço | 0.3 | 0 | 0.4 | 0.3 | 0 | 0 |

> Nota do modelo: o combate resolve dano físico por `ATK_PER_FOR·FOR + ATK_PER_DES·DES` (FOR vale 4× DES por ponto) e mágico por `MATK_PER_INT·INT`. `attackType` é mágico quando INT efetivo > FOR efetivo. Os jobs base (tier 1) não têm `attributeFocus`, então a linha de classe só influencia via `attackType` — toda a diferença entre classes vem da build de atributos.

## 1. Progressão principal (Nv 1 → parada)

### Resumo por classe

| Classe | Nível final | Caps. concluídos | Tempo simulado total | Mortes | Parada |
| --- | --- | --- | --- | --- | --- |
| Guerreiro | 50 | 10 / 10 | 1h 2m | 26 | concluiu os 10 capítulos |
| Arcanista | 59 | 10 / 10 | 1h 16m | 22 | concluiu os 10 capítulos |
| Caçador | 73 | 10 / 10 | 2h 1m | 36 | concluiu os 10 capítulos |
| Infiltrador | 71 | 10 / 10 | 1h 58m | 37 | concluiu os 10 capítulos |
| Mercador | 55 | 10 / 10 | 1h 33m | 24 | concluiu os 10 capítulos |
| Acólito | 66 | 10 / 10 | 3h 19m | 31 | concluiu os 10 capítulos |

**Dispersão entre classes:** mais rápida = `Guerreiro` (1h 2m), mais lenta = `Acólito` (3h 19m) → **3.2×**. Um fator próximo de 1× indica classes parelhas; acima de ~2× já é candidato a ajuste.

### Detalhe por capítulo

#### Guerreiro

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 14s | 2 | 0 | 11 | 64.5× |  |
| 2 | Esgotos de Aurelis | 4 | 10 | 2m 41s | 5 | 26 | 32 | 72.4× |  |
| 3 | Florestas de Sylmere | 10 | 16 | 4m 42s | 4 | 37 | 43 | 69.4× |  |
| 4 | Torre Arcana | 16 | 21 | 5m 10s | 4 | 36 | 42 | 73.4× |  |
| 5 | Colinas de Kaeshin | 21 | 25 | 4m 48s | 2 | 35 | 40 | 63.1× |  |
| 6 | Caverna de Kaeshin | 25 | 29 | 5m 33s | 2 | 41 | 46 | 66.0× |  |
| 7 | Dunas de Zahkar | 29 | 35 | 9m 15s | 2 | 76 | 81 | 64.6× |  |
| 8 | Pirâmide Esquecida | 35 | 42 | 12m 21s | 2 | 106 | 111 | 68.5× |  |
| 9 | Costa de Ventomar | 42 | 50 | 15m 52s | 2 | 147 | 152 | 68.9× |  |
| 10 | Navio Naufragado | 50 | 50 | 29s | 1 | 0 | 4 | 66.0× |  |

#### Arcanista

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 9s | 2 | 0 | 11 | 72.7× |  |
| 2 | Esgotos de Aurelis | 4 | 10 | 2m 21s | 4 | 26 | 32 | 87.1× |  |
| 3 | Florestas de Sylmere | 10 | 18 | 5m 39s | 4 | 60 | 66 | 89.4× |  |
| 4 | Torre Arcana | 18 | 23 | 4m 50s | 3 | 45 | 51 | 87.0× |  |
| 5 | Colinas de Kaeshin | 23 | 28 | 5m 44s | 2 | 56 | 61 | 79.0× |  |
| 6 | Caverna de Kaeshin | 28 | 33 | 6m 45s | 2 | 67 | 72 | 81.7× |  |
| 7 | Dunas de Zahkar | 33 | 40 | 10m 53s | 1 | 116 | 121 | 79.8× |  |
| 8 | Pirâmide Esquecida | 40 | 48 | 14m 42s | 2 | 159 | 164 | 84.8× |  |
| 9 | Costa de Ventomar | 48 | 59 | 23m 49s | 2 | 275 | 280 | 86.2× |  |
| 10 | Navio Naufragado | 59 | 59 | 23s | 0 | 0 | 4 | 80.2× |  |

#### Caçador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 21s | 4 | 0 | 11 | 87.7× |  |
| 2 | Esgotos de Aurelis | 4 | 15 | 7m 15s | 12 | 106 | 112 | 113.1× |  |
| 3 | Florestas de Sylmere | 15 | 25 | 11m 53s | 5 | 150 | 156 | 104.3× |  |
| 4 | Torre Arcana | 25 | 32 | 10m 46s | 4 | 125 | 131 | 102.7× |  |
| 5 | Colinas de Kaeshin | 32 | 38 | 10m 35s | 2 | 129 | 134 | 92.6× |  |
| 6 | Caverna de Kaeshin | 38 | 44 | 11m 39s | 2 | 146 | 151 | 98.9× |  |
| 7 | Dunas de Zahkar | 44 | 53 | 18m 59s | 2 | 263 | 268 | 98.3× |  |
| 8 | Pirâmide Esquecida | 53 | 61 | 18m 34s | 2 | 265 | 270 | 106.1× |  |
| 9 | Costa de Ventomar | 61 | 73 | 29m 55s | 2 | 466 | 471 | 113.7× |  |
| 10 | Navio Naufragado | 73 | 73 | 17s | 1 | 0 | 4 | 109.2× |  |

#### Infiltrador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 24s | 5 | 0 | 11 | 87.7× |  |
| 2 | Esgotos de Aurelis | 4 | 16 | 8m 29s | 12 | 128 | 134 | 112.3× |  |
| 3 | Florestas de Sylmere | 16 | 25 | 11m 21s | 5 | 140 | 146 | 97.3× |  |
| 4 | Torre Arcana | 25 | 32 | 11m 18s | 4 | 126 | 132 | 100.1× |  |
| 5 | Colinas de Kaeshin | 32 | 38 | 10m 52s | 2 | 128 | 133 | 90.1× |  |
| 6 | Caverna de Kaeshin | 38 | 44 | 11m 58s | 2 | 146 | 151 | 95.9× |  |
| 7 | Dunas de Zahkar | 44 | 52 | 17m 8s | 2 | 229 | 234 | 95.3× |  |
| 8 | Pirâmide Esquecida | 52 | 61 | 20m 51s | 2 | 293 | 298 | 104.6× |  |
| 9 | Costa de Ventomar | 61 | 71 | 24m 35s | 2 | 376 | 381 | 109.7× |  |
| 10 | Navio Naufragado | 71 | 71 | 18s | 1 | 0 | 4 | 109.2× |  |

#### Mercador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 16s | 2 | 0 | 11 | 59.6× |  |
| 2 | Esgotos de Aurelis | 4 | 10 | 2m 57s | 4 | 26 | 32 | 66.4× |  |
| 3 | Florestas de Sylmere | 10 | 17 | 6m 27s | 4 | 48 | 54 | 62.6× |  |
| 4 | Torre Arcana | 17 | 21 | 5m | 3 | 29 | 35 | 61.1× |  |
| 5 | Colinas de Kaeshin | 21 | 26 | 7m 32s | 3 | 48 | 53 | 56.6× |  |
| 6 | Caverna de Kaeshin | 26 | 31 | 8m 52s | 2 | 58 | 63 | 56.3× |  |
| 7 | Dunas de Zahkar | 31 | 38 | 14m 36s | 2 | 104 | 109 | 53.7× |  |
| 8 | Pirâmide Esquecida | 38 | 45 | 17m 18s | 2 | 123 | 128 | 55.6× |  |
| 9 | Costa de Ventomar | 45 | 55 | 29m | 2 | 218 | 223 | 56.9× |  |
| 10 | Navio Naufragado | 55 | 55 | 36s | 0 | 0 | 4 | 52.5× |  |

#### Acólito

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 26s | 3 | 0 | 11 | 59.6× |  |
| 2 | Esgotos de Aurelis | 4 | 11 | 4m 38s | 6 | 38 | 44 | 66.4× |  |
| 3 | Florestas de Sylmere | 11 | 20 | 12m 34s | 6 | 83 | 89 | 56.8× |  |
| 4 | Torre Arcana | 20 | 25 | 10m 21s | 4 | 54 | 60 | 50.6× |  |
| 5 | Colinas de Kaeshin | 25 | 31 | 15m 27s | 3 | 83 | 88 | 45.2× |  |
| 6 | Caverna de Kaeshin | 31 | 36 | 15m 20s | 2 | 80 | 85 | 44.8× |  |
| 7 | Dunas de Zahkar | 36 | 45 | 33m 16s | 2 | 186 | 191 | 43.7× |  |
| 8 | Pirâmide Esquecida | 45 | 54 | 40m 35s | 2 | 226 | 231 | 43.8× |  |
| 9 | Costa de Ventomar | 54 | 66 | 1h 5m | 2 | 376 | 381 | 43.8× |  |
| 10 | Navio Naufragado | 66 | 66 | 49s | 1 | 0 | 4 | 40.0× |  |

> "Monstros HP-negativo" = monstros em que `dano recebido/s > regen de HP/s` — o personagem só sobrevive porque cura ao matar; "Pior dano/regen" é a razão mais extrema vista no capítulo. "Mortes" só acontecem quando o personagem morre ANTES de matar o monstro (HP cheio não aguenta o `ttk`).

## 2. Progresso offline vs. jogo ativo

Personagem de referência: **Caçador** (snapshots tirados quando o nível cruza 20, 50, 70). "Ativo" = kills reais/s do combate (`simulateCombatTick`) × recompensa por kill. "Offline" = `calculateOfflineRewards` (usa `OFFLINE_EFFICIENCY_FACTOR = 0.7` e `KILLS_PER_HOUR = 900 − 1.5·nível_do_monstro`, independente do DPS real).

| Nível | Estágio (monstro) | Janela | XP offline | XP ativo | Ouro offline | Ouro ativo | Offline/Ativo (XP) | Offline/Ativo (Ouro) | Kills off vs ativo | net HP/s no estágio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Espinho Vagante (Nv 39) | 1h | 142.550 | 116.082 | 94.837 | 77.228 | 123% | 123% | 589 vs 480 | -63.8 |
| 20 | Espinho Vagante (Nv 39) | 4h | 570.200 | 464.326 | 379.348 | 308.911 | 123% | 123% | 2.356 vs 1.919 | -63.8 |
| 20 | Espinho Vagante (Nv 39) | 8h | 1.140.401 | 928.652 | 758.696 | 617.822 | 123% | 123% | 4.712 vs 3.837 | -63.8 |
| 50 | Djinn Menor (Nv 83) | 1h | 274.682 | 369.806 | 182.940 | 246.294 | 74% | 74% | 543 vs 731 | -126.5 |
| 50 | Djinn Menor (Nv 83) | 4h | 1.098.728 | 1.479.226 | 731.762 | 985.176 | 74% | 74% | 2.171 vs 2.923 | -126.5 |
| 50 | Djinn Menor (Nv 83) | 8h | 2.197.457 | 2.958.451 | 1.463.524 | 1.970.352 | 74% | 74% | 4.343 vs 5.847 | -126.5 |
| 70 | Serpente Marinha Jovem (Nv 118) | 1h | 362.368 | 598.629 | 241.410 | 398.808 | 61% | 61% | 506 vs 836 | -187.0 |
| 70 | Serpente Marinha Jovem (Nv 118) | 4h | 1.449.470 | 2.394.518 | 965.639 | 1.595.230 | 61% | 61% | 2.024 vs 3.344 | -187.0 |
| 70 | Serpente Marinha Jovem (Nv 118) | 8h | 2.898.941 | 4.789.036 | 1.931.278 | 3.190.461 | 61% | 61% | 4.049 vs 6.689 | -187.0 |

**Proporção offline/ativo (XP) média: 86%.** Alvo saudável ≈ `OFFLINE_EFFICIENCY_FACTOR` (70%). Muito abaixo → offline punitivo; perto/acima de 100% → jogar ativo perde o sentido. A diferença entre a proporção e 70% vem do descasamento entre `KILLS_PER_HOUR` do modelo offline e a velocidade real de kill do combate (coluna "Kills off vs ativo").

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
