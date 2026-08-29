# Relatório de balanceamento — RAGNAROK

Gerado em 2026-08-29T17:27:33.189Z · `npm run simulate` (packages/game-core)

> Combate/recompensas/offline/gacha vêm de **@game/core** (inalterados). Curva de XP, ganho de atributo por nível e builds por classe são **premissas do harness** (marcadas abaixo).

## Leitura rápida (observações, não recomendações)

- **Progressão rápida demais em relação à curva de nível.** Todas as 6 classes concluem os 10 capítulos em **1h 56m–6h 9m** de jogo simulado, terminando entre **Nv 49 e Nv 72**. O critério "Nv 150" nunca é atingido: os capítulos acabam muito antes, e o personagem fica bem abaixo do nível dos monstros do fim (Cap. 9–10 têm monstros Nv 100–150).
- **Dispersão entre classes: 3.2×** (mais rápida `Guerreiro` 1h 56m · mais lenta `Acólito` 6h 9m). Builds físicas puras (FOR) são as mais rápidas; builds baseadas em DES/INT/VIT rendem menos dano por ponto neste modelo. Nenhuma classe travou numa parede.
- **HP nunca se sustenta sozinho.** Em todos os capítulos de todas as classes o `dano recebido/s` supera o `regen de HP/s` (razões de **11× a 31×**). A sobrevivência depende 100% do heal ao matar; sem ele o personagem morreria em quase todo monstro. Mortes reais (morrer antes de matar) por classe: **30–43** no total.
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
| Guerreiro | 49 | 10 / 10 | 1h 56m | 34 | concluiu os 10 capítulos |
| Arcanista | 58 | 10 / 10 | 2h 24m | 30 | concluiu os 10 capítulos |
| Caçador | 72 | 10 / 10 | 3h 50m | 43 | concluiu os 10 capítulos |
| Infiltrador | 71 | 10 / 10 | 3h 49m | 43 | concluiu os 10 capítulos |
| Mercador | 53 | 10 / 10 | 2h 50m | 32 | concluiu os 10 capítulos |
| Acólito | 64 | 10 / 10 | 6h 9m | 36 | concluiu os 10 capítulos |

**Dispersão entre classes:** mais rápida = `Guerreiro` (1h 56m), mais lenta = `Acólito` (6h 9m) → **3.2×**. Um fator próximo de 1× indica classes parelhas; acima de ~2× já é candidato a ajuste.

### Detalhe por capítulo

#### Guerreiro

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 3 | 1m 25s | 4 | 0 | 11 | 19.4× |  |
| 2 | Esgotos de Aurelis | 3 | 10 | 5m 31s | 9 | 61 | 67 | 21.2× |  |
| 3 | Florestas de Sylmere | 10 | 16 | 8m 50s | 5 | 77 | 83 | 19.1× |  |
| 4 | Torre Arcana | 16 | 20 | 7m 49s | 4 | 56 | 62 | 18.4× |  |
| 5 | Colinas de Kaeshin | 20 | 24 | 9m 13s | 3 | 68 | 73 | 16.6× |  |
| 6 | Caverna de Kaeshin | 24 | 29 | 13m 15s | 3 | 103 | 108 | 17.3× |  |
| 7 | Dunas de Zahkar | 29 | 35 | 18m 12s | 1 | 155 | 160 | 16.2× |  |
| 8 | Pirâmide Esquecida | 35 | 41 | 20m 43s | 2 | 178 | 183 | 17.1× |  |
| 9 | Costa de Ventomar | 41 | 49 | 31m 1s | 2 | 283 | 288 | 17.8× |  |
| 10 | Navio Naufragado | 49 | 49 | 30s | 1 | 0 | 4 | 17.0× |  |

#### Arcanista

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 3 | 1m 19s | 4 | 0 | 11 | 21.0× |  |
| 2 | Esgotos de Aurelis | 3 | 10 | 4m 52s | 7 | 61 | 67 | 24.2× |  |
| 3 | Florestas de Sylmere | 10 | 17 | 9m 6s | 5 | 97 | 103 | 24.1× |  |
| 4 | Torre Arcana | 17 | 22 | 9m 2s | 4 | 85 | 91 | 23.1× |  |
| 5 | Colinas de Kaeshin | 22 | 27 | 10m 51s | 2 | 106 | 111 | 20.8× |  |
| 6 | Caverna de Kaeshin | 27 | 32 | 12m 53s | 2 | 128 | 133 | 21.3× |  |
| 7 | Dunas de Zahkar | 32 | 40 | 24m 13s | 2 | 261 | 266 | 20.7× |  |
| 8 | Pirâmide Esquecida | 40 | 47 | 25m 4s | 2 | 271 | 276 | 21.2× |  |
| 9 | Costa de Ventomar | 47 | 58 | 46m 20s | 2 | 528 | 533 | 22.2× |  |
| 10 | Navio Naufragado | 58 | 58 | 24s | 0 | 0 | 4 | 20.5× |  |

#### Caçador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 40s | 5 | 5 | 16 | 24.5× |  |
| 2 | Esgotos de Aurelis | 4 | 15 | 13m 29s | 16 | 202 | 208 | 30.6× |  |
| 3 | Florestas de Sylmere | 15 | 25 | 22m 33s | 5 | 292 | 298 | 26.1× |  |
| 4 | Torre Arcana | 25 | 31 | 17m 45s | 4 | 205 | 211 | 25.7× |  |
| 5 | Colinas de Kaeshin | 31 | 37 | 20m 19s | 3 | 242 | 247 | 24.1× |  |
| 6 | Caverna de Kaeshin | 37 | 43 | 22m 34s | 3 | 277 | 282 | 25.6× |  |
| 7 | Dunas de Zahkar | 43 | 52 | 37m 10s | 2 | 503 | 508 | 25.4× |  |
| 8 | Pirâmide Esquecida | 52 | 61 | 40m 54s | 2 | 582 | 587 | 27.0× |  |
| 9 | Costa de Ventomar | 61 | 72 | 54m 4s | 2 | 835 | 840 | 28.3× |  |
| 10 | Navio Naufragado | 72 | 72 | 18s | 1 | 0 | 4 | 27.7× |  |

#### Infiltrador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 4 | 1m 42s | 5 | 5 | 16 | 24.3× |  |
| 2 | Esgotos de Aurelis | 4 | 15 | 14m 3s | 16 | 202 | 208 | 30.4× |  |
| 3 | Florestas de Sylmere | 15 | 25 | 23m 37s | 5 | 292 | 298 | 25.5× |  |
| 4 | Torre Arcana | 25 | 31 | 18m 29s | 4 | 205 | 211 | 25.0× |  |
| 5 | Colinas de Kaeshin | 31 | 37 | 21m 3s | 3 | 242 | 247 | 23.4× |  |
| 6 | Caverna de Kaeshin | 37 | 43 | 23m 12s | 3 | 277 | 282 | 24.8× |  |
| 7 | Dunas de Zahkar | 43 | 52 | 37m 48s | 2 | 503 | 508 | 24.6× |  |
| 8 | Pirâmide Esquecida | 52 | 60 | 36m 24s | 2 | 507 | 512 | 26.2× |  |
| 9 | Costa de Ventomar | 60 | 71 | 53m 22s | 2 | 811 | 816 | 27.9× |  |
| 10 | Navio Naufragado | 71 | 71 | 18s | 1 | 0 | 4 | 27.2× |  |

#### Mercador

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 3 | 1m 26s | 4 | 0 | 11 | 18.2× |  |
| 2 | Esgotos de Aurelis | 3 | 10 | 6m 4s | 7 | 61 | 67 | 19.9× |  |
| 3 | Florestas de Sylmere | 10 | 16 | 10m 13s | 5 | 77 | 83 | 17.2× |  |
| 4 | Torre Arcana | 16 | 21 | 11m 46s | 4 | 76 | 82 | 16.4× |  |
| 5 | Colinas de Kaeshin | 21 | 25 | 11m 28s | 2 | 74 | 79 | 14.1× |  |
| 6 | Caverna de Kaeshin | 25 | 30 | 16m 55s | 3 | 111 | 116 | 14.8× |  |
| 7 | Dunas de Zahkar | 30 | 37 | 28m 6s | 2 | 198 | 203 | 14.0× |  |
| 8 | Pirâmide Esquecida | 37 | 44 | 33m 26s | 2 | 236 | 241 | 14.4× |  |
| 9 | Costa de Ventomar | 44 | 53 | 50m 27s | 2 | 369 | 374 | 14.7× |  |
| 10 | Navio Naufragado | 53 | 53 | 38s | 1 | 0 | 4 | 13.8× |  |

#### Acólito

| Cap. | Região | Nv entra | Nv sai | Tempo simulado | Mortes | Kills de farm | Monstros HP-negativo | Pior dano/regen | Parede? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Campos ao Redor de Aurelis | 1 | 3 | 1m 35s | 4 | 0 | 11 | 18.2× |  |
| 2 | Esgotos de Aurelis | 3 | 11 | 9m 5s | 10 | 82 | 88 | 19.9× |  |
| 3 | Florestas de Sylmere | 11 | 19 | 20m 43s | 5 | 137 | 143 | 15.6× |  |
| 4 | Torre Arcana | 19 | 24 | 19m 20s | 4 | 102 | 108 | 13.5× |  |
| 5 | Colinas de Kaeshin | 24 | 30 | 29m 11s | 3 | 155 | 160 | 11.9× |  |
| 6 | Caverna de Kaeshin | 30 | 35 | 29m 36s | 3 | 154 | 159 | 11.7× |  |
| 7 | Dunas de Zahkar | 35 | 43 | 56m 26s | 2 | 305 | 310 | 11.4× |  |
| 8 | Pirâmide Esquecida | 43 | 52 | 1h 17m | 2 | 415 | 420 | 11.7× |  |
| 9 | Costa de Ventomar | 52 | 64 | 2h 5m | 2 | 699 | 704 | 11.6× |  |
| 10 | Navio Naufragado | 64 | 64 | 51s | 1 | 0 | 4 | 10.5× |  |

> "Monstros HP-negativo" = monstros em que `dano recebido/s > regen de HP/s` — o personagem só sobrevive porque cura ao matar; "Pior dano/regen" é a razão mais extrema vista no capítulo. "Mortes" só acontecem quando o personagem morre ANTES de matar o monstro (HP cheio não aguenta o `ttk`).

## 2. Progresso offline vs. jogo ativo

Personagem de referência: **Caçador** (snapshots tirados quando o nível cruza 20, 50, 70). "Ativo" = kills reais/s do combate (`simulateCombatTick`) × recompensa por kill. "Offline" = `calculateOfflineRewards` (usa `OFFLINE_EFFICIENCY_FACTOR = 0.7` e `KILLS_PER_HOUR = 900 − 1.5·nível_do_monstro`, independente do DPS real).

| Nível | Estágio (monstro) | Janela | XP offline | XP ativo | Ouro offline | Ouro ativo | Offline/Ativo (XP) | Offline/Ativo (Ouro) | Kills off vs ativo | net HP/s no estágio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Espinho Vagante (Nv 39) | 1h | 73.631 | 59.959 | 94.837 | 77.228 | 123% | 123% | 589 vs 480 | -61.3 |
| 20 | Espinho Vagante (Nv 39) | 4h | 294.525 | 239.838 | 379.348 | 308.911 | 123% | 123% | 2.356 vs 1.919 | -61.3 |
| 20 | Espinho Vagante (Nv 39) | 8h | 589.050 | 479.676 | 758.696 | 617.822 | 123% | 123% | 4.712 vs 3.837 | -61.3 |
| 50 | Djinn Menor (Nv 83) | 1h | 139.512 | 187.827 | 182.940 | 246.294 | 74% | 74% | 543 vs 731 | -121.9 |
| 50 | Djinn Menor (Nv 83) | 4h | 558.050 | 751.306 | 731.762 | 985.176 | 74% | 74% | 2.171 vs 2.923 | -121.9 |
| 50 | Djinn Menor (Nv 83) | 8h | 1.116.100 | 1.502.613 | 1.463.524 | 1.970.352 | 74% | 74% | 4.343 vs 5.847 | -121.9 |
| 70 | Serpente Marinha Jovem (Nv 118) | 1h | 183.208 | 302.659 | 241.410 | 398.808 | 61% | 61% | 506 vs 836 | -181.0 |
| 70 | Serpente Marinha Jovem (Nv 118) | 4h | 732.833 | 1.210.636 | 965.639 | 1.595.230 | 61% | 61% | 2.024 vs 3.344 | -181.0 |
| 70 | Serpente Marinha Jovem (Nv 118) | 8h | 1.465.666 | 2.421.272 | 1.931.278 | 3.190.461 | 61% | 61% | 4.049 vs 6.689 | -181.0 |

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
