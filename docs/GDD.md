# GDD — [Nome Provisório do Jogo]
### Um Idle RPG ambientado no Continente de Elyndor

*Documento de design vivo — v0.2. Este é o ponto de partida para orientar o desenvolvimento com Claude Code no Antigravity. Tudo aqui é original: mundo, nomes, monstros, classes e sistemas.*

---

## 1. Visão Geral

Um Idle RPG 2D onde o jogador cria um herói, avança automaticamente por **estágios** (em vez de exploração livre em tempo real), evolui de classe, coleciona **Selos de Batalha** (equivalente a cartas) e recruta **Companheiros** (pets) em tiers de raridade. O núcleo do jogo é progressão: auto-farm, evolução offline, rebirth/prestígio, e colecionismo.

O mundo se chama **Aldenor**, um continente dividido em seis grandes cidades, cada uma cercada por regiões de dificuldade crescente — os **Estágios**, que substituem os "campos e masmorras" abertos por uma progressão linear em capítulos, ideal para o formato idle.

---

## 2. O Continente de Elyndor — Cidades e Regiões

| Cidade | Papel | Inspiração estrutural |
|---|---|---|
| **Aurelis** | Capital do reino, centro de comércio e ponto de partida dos heróis | Capital central |
| **Ondara** | Cidade-satélite portuária, sede da Arena de Combate | Cidade-satélite com arena |
| **Sylmere** | Cidade da magia, cercada por florestas, lar da Torre Arcana | Cidade mágica cercada de floresta |
| **Zahkar** | Cidade no deserto ao sul, associada a ladinos e assassinos | Cidade do deserto |
| **Kaeshin** | Vila montanhosa de estilo oriental, lar dos arqueiros | Cidade montanhosa oriental |
| **Ventomar** | Cidade portuária comercial, principal hub de mercadores | Hub comercial portuário |

### Estágios por região (exemplo de curva de dificuldade)

**Capítulo 1 — Campos ao Redor de Aurelis (Nv. 1–20)**
Zona inicial, criaturas fracas de planta, inseto e bruto.

**Capítulo 2 — Esgotos de Aurelis (Nv. 15–30)**
Masmorra subterrânea, insetos e anfíbios.

**Capítulo 3 — Florestas de Sylmere (Nv. 25–45)**
Criaturas mágicas, plantas e mortos-vivos leves.

**Capítulo 4 — Torre Arcana (Nv. 40–60)**
Masmorra vertical, demônios menores e constructos mágicos.

**Capítulo 5 — Colinas de Kaeshin (Nv. 50–70)**
Bestas selvagens e espíritos da floresta.

**Capítulo 6 — Caverna de Kaeshin (Nv. 60–80)**
Mortos-vivos e esqueletos guerreiros.

**Capítulo 7 — Dunas de Zahkar (Nv. 70–90)**
Criaturas do deserto, escorpiões e brutos adaptados ao calor.

**Capítulo 8 — Pirâmide Esquecida (Nv. 85–110)**
Masmorra endgame inicial: mortos-vivos avançados e um chefe (MVP).

**Capítulo 9 — Costa de Ventomar (Nv. 100–130)**
Criaturas aquáticas, piratas fantasmas.

**Capítulo 10 — Navio Naufragado (Nv. 120+)**
Masmorra endgame, chefes lendários.

---

## 3. Sistema de Atributos

Sistema clássico de 6 atributos (padrão amplamente usado em RPGs, incluindo o gênero idle/MMO):

| Atributo | Efeito |
|---|---|
| **FOR** (Força) | Dano físico corpo a corpo, capacidade de carga |
| **AGI** (Agilidade) | Velocidade de ataque, esquiva |
| **VIT** (Vitalidade) | HP máximo, regeneração, defesa física |
| **INT** (Inteligência) | Dano mágico, SP máximo, defesa mágica |
| **DES** (Destreza) | Precisão, dano à distância, redução de conjuração |
| **SOR** (Sorte) | Chance de crítico, resistência a crítico |

---

## 4. Árvore de Classes (Job 1 → 2 → 3 "Transcendido" → 4 "Avançado")

### Linha do Guerreiro
Combate corpo a corpo, linha de frente. Job 1: **Recruta**

| Linha de Evolução | Atributos Foco | Estilo de Jogo / Diferencial |
|---|---|---|
| Recruta ➔ **Sentinela** ➔ **Vanguarda** ➔ **Marechal de Aço** | FOR (dano/penetração), VIT secundário | Tanque ofensivo, dano físico massivo em área, quebra de armadura inimiga. Habilidades de assinatura: *Golpe Sísmico* (dano em área + atordoamento), *Postura Inabalável* (redução de dano por tempo limitado). |
| Recruta ➔ **Corsário de Lâmina** ➔ **Dançarino de Lâminas** ➔ **Tempestade Carmesim** | AGI (velocidade/crítico) | DPS físico ágil, combos rápidos e esquiva. Habilidades: *Dança das Lâminas* (multi-hit crescente), *Sombra Veloz* (esquiva + contra-ataque). |

### Linha do Arcanista
Dano mágico à distância. Job 1: **Aprendiz**

| Linha de Evolução | Atributos Foco | Estilo de Jogo / Diferencial |
|---|---|---|
| Aprendiz ➔ **Piromante** ➔ **Arquimago Ígneo** ➔ **Senhor das Chamas Eternas** | INT (dano elemental) | Dano em área de altíssimo burst, forte contra grupos. Habilidades: *Chuva de Meteoros* (AoE de fogo), *Combustão* (dano contínuo escalável). |
| Aprendiz ➔ **Cronomante** ➔ **Tecelão do Tempo** ➔ **Guardião das Eras** | INT/DES (controle) | Suporte de grupo e controle de campo (lentidão, stun, aceleração de aliados). Habilidades: *Dilatação Temporal* (buff de velocidade em grupo), *Congelar Instante* (controle em área). |

### Linha do Caçador
Dano físico à distância, DPS sustentado. Job 1: **Batedor**

| Linha de Evolução | Atributos Foco | Estilo de Jogo / Diferencial |
|---|---|---|
| Batedor ➔ **Flecheiro** ➔ **Atirador de Elite** ➔ **Predador Silencioso** | DES (precisão/crítico) | Dano single-target altíssimo, ideal contra chefes. Habilidades: *Tiro Perfurante* (dano crítico garantido), *Foco Predatório* (bônus de dano crescente por acerto). |
| Batedor ➔ **Rastreador** ➔ **Mestre das Armadilhas** ➔ **Senhor da Caça** | DES/AGI (controle de área) | Dano em área e debuffs via armadilhas, forte em farm de hordas. Habilidades: *Campo Minado* (armadilhas em área), *Rede de Espinhos* (imobilização em área). |

### Linha do Infiltrador
Crítico e dano de burst. Job 1: **Ladino**

| Linha de Evolução | Atributos Foco | Estilo de Jogo / Diferencial |
|---|---|---|
| Ladino ➔ **Sombra** ➔ **Lâmina Silenciosa** ➔ **Executor das Trevas** | SOR/AGI (crítico/execução) | Assassinato single-target, bônus de dano contra alvos com HP baixo. Habilidades: *Golpe Fatal* (dano crítico massivo), *Execução Sombria* (dano bônus abaixo de 30% HP do alvo). |
| Ladino ➔ **Ilusionista** ➔ **Mestre dos Disfarces** ➔ **Véu do Caos** | AGI/INT (evasão/debuff) | Evasão alta, confusão e debuffs em área, suporte de controle. Habilidades: *Espelho Ilusório* (clone que desvia ataques), *Névoa Mental* (debuff de precisão em área). |

### Linha do Mercador
Suporte econômico e utilidade. Job 1: **Negociante**

| Linha de Evolução | Atributos Foco | Estilo de Jogo / Diferencial |
|---|---|---|
| Negociante ➔ **Alquimista** ➔ **Mestre das Poções** ➔ **Grão-Alquimista** | INT/VIT (utilidade) | Criação de itens, buffs de grupo e cura alternativa via poções. Habilidades: *Fervura Vital* (cura em área), *Elixir de Fúria* (buff de dano em grupo). |
| Negociante ➔ **Artífice** ➔ **Engenheiro de Guerra** ➔ **Arquiteto de Autômatos** | DES/INT (invocação) | Invocação de constructos/torretas que lutam junto ao jogador, ótimo para farm automatizado (perfeito pro formato idle). Habilidades: *Torreta de Faísca* (dano automático contínuo), *Autômato Guardião* (invocação tanque). |

### Linha do Acólito
Cura e suporte. Job 1: **Noviço**

| Linha de Evolução | Atributos Foco | Estilo de Jogo / Diferencial |
|---|---|---|
| Noviço ➔ **Clérigo** ➔ **Sacerdote** ➔ **Grão-Sacerdote** | INT (cura/suporte) | Cura em área, ressurreição e buffs sagrados de grupo. Habilidades: *Luz Restauradora* (cura em área contínua), *Bênção Maior* (buff de todos os atributos do grupo). |
| Noviço ➔ **Monge** ➔ **Mestre Marcial** ➔ **Avatar Espiritual** | FOR/VIT (híbrido) | Combate corpo a corpo com técnicas espirituais e auto-cura, ótimo como sub-tanque. Habilidades: *Punho do Vazio* (dano físico + cura própria), *Respiração Ancestral* (regeneração contínua de HP/SP). |

---

## 5. Bestiário Completo

### Capítulo 1 — Campos ao Redor de Aurelis (Nv. 1–20)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Gotinha | 1 | Planta | Água 1 | Médio |
| Coelhal | 1 | Bruto | Neutro 1 | Pequeno |
| Broteiro | 2 | Inseto | Terra 1 | Pequeno |
| Casulim | 3 | Inseto | Terra 1 | Pequeno |
| Vento-Zune | 4 | Inseto | Vento 1 | Pequeno |
| Salgueira | 6 | Planta | Terra 1 | Médio |
| Rolante | 8 | Inseto | Terra 1 | Médio |
| Filhotinho Selvagem | 9 | Bruto | Neutro 1 | Pequeno |
| Aerofel | 11 | Bruto | Vento 1 | Pequeno |
| Cavador-Sombrio | 14 | Inseto | Sombrio 1 | Pequeno |
| Sapo-de-Poça | 18 | Anfíbio | Água 1 | Médio |
| **Salgueira Ancestral (Mini)** | 20 | Planta | Terra 2 | Grande |

### Capítulo 2 — Esgotos de Aurelis (Nv. 15–30)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Ovo Rastejante | 10 | Inseto | Terra 1 | Pequeno |
| Larva Luminosa | 13 | Inseto | Neutro 1 | Pequeno |
| Aracnil | 18 | Inseto | Terra 1 | Médio |
| Esporo Flutuante | 20 | Planta | Água 1 | Pequeno |
| Trilobite Cavernoso | 23 | Anfíbio | Água 1 | Médio |
| Fungo Rastejante | 26 | Planta | Terra 1 | Pequeno |
| **Chifre-Sombra (Mini)** | 29 | Amorfo | Fantasma 1 | Médio |

### Capítulo 3 — Florestas de Sylmere (Nv. 25–45)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Mandrágora Cintilante | 25 | Planta | Terra 1 | Pequeno |
| Vagalume Feérico | 27 | Inseto | Neutro 1 | Pequeno |
| Tocha Ambulante | 30 | Amorfo | Fogo 1 | Médio |
| Coruja Arcana | 32 | Bruto | Vento 1 | Pequeno |
| Sussurro da Copa | 36 | Morto-vivo | Sombrio 1 | Pequeno |
| Espinho Vagante | 39 | Planta | Terra 2 | Médio |
| **Guardião de Galhos (Mini)** | 44 | Planta | Terra 2 | Grande |

### Capítulo 4 — Torre Arcana (Nv. 40–60)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Pesadelo Menor | 40 | Demônio | Sombrio 1 | Pequeno |
| Diabrete Fumegante | 43 | Demônio | Fogo 1 | Pequeno |
| Grimório Vivo | 46 | Amorfo | Sombrio 1 | Pequeno |
| Sentinela de Cristal | 49 | Amorfo | Neutro 2 | Médio |
| Chama Perdida | 52 | Demônio | Fogo 1 | Pequeno |
| Golem Faiscante | 55 | Amorfo | Terra 2 | Grande |
| **Reflexo Sombrio (MVP)** | 60 | Amorfo | Sombrio 2 | Médio |

### Capítulo 5 — Colinas de Kaeshin (Nv. 50–70)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Lobo das Brumas | 50 | Bruto | Água 1 | Médio |
| Urso-Espinho | 53 | Bruto | Terra 1 | Grande |
| Espírito da Cachoeira | 56 | Amorfo | Água 1 | Médio |
| Pantera Sombria | 59 | Bruto | Sombrio 1 | Médio |
| Falcão de Granito | 62 | Bruto | Vento 1 | Pequeno |
| **Cervo Ancestral (Mini)** | 68 | Bruto | Terra 2 | Grande |

### Capítulo 6 — Caverna de Kaeshin (Nv. 60–80)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Ossada Errante | 60 | Morto-vivo | Sombrio 1 | Médio |
| Guerreiro Caído | 64 | Morto-vivo | Sombrio 1 | Médio |
| Corvo Necrófago | 67 | Morto-vivo | Vento 1 | Pequeno |
| Alma Presa | 70 | Amorfo | Fantasma 1 | Pequeno |
| Carrasco Enferrujado | 74 | Morto-vivo | Sombrio 2 | Grande |
| **General Esquecido (MVP)** | 80 | Morto-vivo | Sombrio 2 | Grande |

### Capítulo 7 — Dunas de Zahkar (Nv. 70–90)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Aranha-do-Sol | 70 | Inseto | Fogo 1 | Pequeno |
| Escaravelho Blindado | 73 | Inseto | Terra 1 | Pequeno |
| Camelo Selvagem | 76 | Bruto | Terra 1 | Grande |
| Víbora das Areias | 79 | Bruto | Terra 1 | Pequeno |
| Djinn Menor | 83 | Demônio | Fogo 1 | Médio |
| **Colosso de Areia (Mini)** | 89 | Amorfo | Terra 2 | Grande |

### Capítulo 8 — Pirâmide Esquecida (Nv. 85–110)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Múmia Selada | 85 | Morto-vivo | Terra 1 | Médio |
| Escaravelho Dourado | 88 | Inseto | Terra 1 | Pequeno |
| Guardião de Sarcófago | 92 | Morto-vivo | Sombrio 1 | Grande |
| Sacerdote Amaldiçoado | 96 | Morto-vivo | Sombrio 2 | Médio |
| Espectro Dourado | 101 | Amorfo | Fantasma 2 | Médio |
| **Rei do Areal Eterno (MVP)** | 110 | Morto-vivo | Sombrio 2 | Grande |

### Capítulo 9 — Costa de Ventomar (Nv. 100–130)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Sereia das Marés | 100 | Peixe | Água 1 | Médio |
| Caranguejo Titânico | 104 | Bruto | Água 1 | Grande |
| Água-viva Luminosa | 108 | Amorfo | Água 1 | Pequeno |
| Pirata Afogado | 112 | Morto-vivo | Água 1 | Médio |
| Serpente Marinha Jovem | 118 | Dragão | Água 2 | Grande |
| **Kraken Jovem (Mini)** | 128 | Peixe | Água 2 | Grande |

### Capítulo 10 — Navio Naufragado (Nv. 120+)
| Monstro | Nível | Raça | Elemento | Tamanho |
|---|---|---|---|---|
| Fantasma do Convés | 120 | Morto-vivo | Fantasma 1 | Médio |
| Marujo Amaldiçoado | 124 | Morto-vivo | Água 1 | Médio |
| Sino Assombrado | 128 | Amorfo | Fantasma 2 | Médio |
| Capitão Sem-Nome | 133 | Morto-vivo | Água 2 | Grande |
| **Capitão Amaldiçoado (MVP)** | 140 | Morto-vivo | Água 2 | Grande |
| **Serpente das Profundezas (MVP Final)** | 150 | Dragão | Água 3 | Grande |

---

## 6. Sistema de Selos de Batalha (equivalente a Cartas)

Selos são fragmentos de essência de monstros derrotados, encaixáveis em equipamentos para bônus passivos, com bônus extra de coleção por conjunto ("Compêndio"). Organizados por tipo de equipamento, com raridade crescente conforme a faixa de nível do monstro de origem.

### 6.1 Selos para Armas
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo do Coelhal | Comum (Nv 1–20) | SOR +1, Crítico +1%, Esquiva +1 | ATQ.M +2 |
| Selo do Filhotinho Selvagem | Comum (Nv 1–20) | ATQ +5, ATQ.M +5, 2% chance de Atordoar | HP Máx +20 |
| Selo da Aracnil | Incomum (Nv 21–40) | AGI +1, Esquiva +1, ATQ +5 | HP Máx +20 |
| Selo do Sussurro da Copa | Incomum (Nv 21–40) | ATQ +10, ATQ.M +10, 2% chance de Medo | ATQ +2 |
| Selo do Lobo das Brumas | Raro (Nv 41–60) | ATQ +15, Acerto +5 | ATQ +2 |
| Selo da Aranha-do-Sol | Raro (Nv 61–90) | Dano contra elemento Fogo +20% | Dano Fogo +1% |
| Selo do Golem Faiscante | Épico (Nv 55+) | Dano contra raça Amorfo +20% | Dano Sem-Forma +1% |
| Selo do Capitão Amaldiçoado | Lendário (Nv 120+) | ATQ +40, 10% chance de Maldição | Dano vs. Morto-vivo +3% |

### 6.2 Selos para Armaduras
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo do Broteiro | Comum (Nv 1–20) | VIT +2, HP Máx +250 | DEF +2 |
| Selo da Salgueira | Comum (Nv 1–20) | Redução de dano de Planta -5% | HP Máx +30 |
| Selo do Trilobite Cavernoso | Incomum (Nv 21–40) | Redução de dano de Água -5% | DEF +3 |
| Selo do Urso-Espinho | Raro (Nv 41–60) | HP Máx +8%, VIT +5 | DEF +5 |
| Selo do Guerreiro Caído | Raro (Nv 61–90) | Redução de dano de Morto-vivo -10% | HP Máx +5% |
| Selo do Guardião de Sarcófago | Épico (Nv 85–110) | HP Máx +12%, Redução de Sombrio -8% | DEF +10 |
| Selo do Capitão Sem-Nome | Lendário (Nv 120+) | HP Máx +15%, Imunidade a Medo | DEF +15 |

### 6.3 Selos para Escudos
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo do Casulim | Comum (Nv 1–20) | Bloqueio +3% | DEF +2 |
| Selo do Rolante | Incomum (Nv 21–40) | Redução de dano de Inseto -8% | Bloqueio +2% |
| Selo da Pantera Sombria | Raro (Nv 41–60) | Redução de dano de Sombrio -10% | Bloqueio +3% |
| Selo do Carrasco Enferrujado | Épico (Nv 61–90) | Reflete 5% do dano recebido | DEF +8 |
| Selo do Colosso de Areia | Épico (Nv 70–90) | Redução de dano de Terra -12% | Bloqueio +4% |
| Selo do Sino Assombrado | Lendário (Nv 120+) | 15% chance de anular dano crítico recebido | DEF +12 |

### 6.4 Selos para Capas
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo do Vento-Zune | Comum (Nv 1–20) | Esquiva +3 contra Inseto | Esquiva +1 |
| Selo do Aerofel | Incomum (Nv 21–40) | Esquiva +5 contra Bruto | Esquiva +2 |
| Selo do Falcão de Granito | Raro (Nv 41–60) | Redução de dano de Vento -10% | Esquiva +3 |
| Selo do Corvo Necrófago | Raro (Nv 61–90) | Esquiva +8 contra Morto-vivo | Esquiva +3 |
| Selo do Espectro Dourado | Épico (Nv 85–110) | Redução de dano de Fantasma -12% | Esquiva +5 |
| Selo da Serpente das Profundezas | Lendário (Nv 140+) | Redução de todo dano elemental -5% | Esquiva +8 |

### 6.5 Selos para Sapatos
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo da Larva Luminosa | Comum (Nv 1–20) | ASPD +2% | Velocidade de Movimento +2% |
| Selo do Fungo Rastejante | Incomum (Nv 21–40) | ASPD +4%, SP regen +1 | Velocidade +3% |
| Selo da Coruja Arcana | Raro (Nv 41–60) | ASPD +6%, redução de tempo de conjuração -3% | Velocidade +4% |
| Selo do Escaravelho Blindado | Raro (Nv 61–90) | ASPD +8% | Velocidade +5% |
| Selo da Múmia Selada | Épico (Nv 85–110) | Imunidade a Lentidão | ASPD +5% |
| Selo do Marujo Amaldiçoado | Lendário (Nv 120+) | ASPD +12%, Velocidade +10% | Velocidade +8% |

### 6.6 Selos para Acessórios
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo da Gotinha | Comum (Nv 1–20) | SP Máx +5% | INT +1 |
| Selo do Sapo-de-Poça | Incomum (Nv 21–40) | Redução de tempo de conjuração fixo -5% | INT +2 |
| Selo do Grimório Vivo | Raro (Nv 41–60) | ATQ.M +8%, SP Máx +5% | INT +3 |
| Selo da Chama Perdida | Épico (Nv 40–60) | Dano mágico +10% contra Demônio | ATQ.M +5% |
| Selo do Djinn Menor | Épico (Nv 70–90) | Chance de crítico mágico +5% | ATQ.M +6% |
| Selo do Sacerdote Amaldiçoado | Lendário (Nv 85–110) | Cura recebida +15% | SP Máx +10% |

### 6.7 Selos para Elmos (Equipamentos de Cabeça)
| Selo | Raridade | Efeito Principal | Bônus de Compêndio |
|---|---|---|---|
| Selo da Cavador-Sombrio | Comum (Nv 1–20) | Percepção +3 (visão de itens raros) | DES +1 |
| Selo do Esporo Flutuante | Incomum (Nv 21–40) | HP regen +2%/10s | VIT +2 |
| Selo do Espinho Vagante | Raro (Nv 41–60) | Redução de dano de Planta -8% | DEF +3 |
| Selo da Ossada Errante | Raro (Nv 61–90) | Redução de dano de Morto-vivo -8% | DEF +4 |
| Selo da Sereia das Marés | Épico (Nv 100–130) | Redução de dano de Água -10% | HP Máx +6% |
| Selo do General Esquecido | Lendário (Nv 80+) | Todos os atributos +3 | Todos os atributos +1 |

*Regra geral: um mesmo Selo só pode ser equipado uma vez por personagem (sem duplicar o efeito em múltiplos slots), mas pode ser reforjado (upgrade) para aumentar a magnitude do efeito principal até um teto por raridade.*

---

## 7. Companheiros (Pets) por Tier

Companheiros lutam ao lado do jogador de forma automática — peça central do formato idle. Cada um tem um **papel de combate** fixo e evolui por **fragmentos** obtidos em farm ou invocação, ganhando estatísticas e, nos tiers mais altos, uma habilidade definitiva ao atingir a evolução máxima.

### Tier S — Lendários (Endgame / PvP)
| Companheiro | Papel | Descrição |
|---|---|---|
| **Vendaval** | DPS em Área (AoE) | Rei do dano em área; essencial para limpar hordas e acelerar o farm diário. Na evolução máxima, seus ataques encadeiam entre múltiplos alvos. |
| **Espírito de Bronze** | DPS Físico | Excelente dano físico sustentado; conforme evolui, passa a transferir uma % do próprio ataque diretamente para o personagem. |
| **Lâmina Fantasma** | DPS Crítico (Single-Target) | Focado em crítico e dano massivo contra um único alvo — a melhor opção para chefes e MVPs. |
| **Guardião de Pedra** | Tanque | O melhor tanque lendário: absorve dano direcionado ao jogador e cria escudos de proteção periódicos. |

### Tier A — Avançados
| Companheiro | Papel | Descrição |
|---|---|---|
| **Coruja Sábia** | Suporte | Um dos melhores suportes do jogo: fornece buffs de atributo e escudos utilitários ao grupo. |
| **Fera das Brumas** | DPS Físico | Dano físico consistente com chance de sangramento acumulativo. |
| **Choque de Safira** | DPS Mágico em Área | Dano elemental de água em área, forte contra grupos de monstros terrestres. |
| **Escamas de Ferro** | Tanque Secundário | Boa opção de tanque intermediário, com redução fixa de dano físico recebido. |

### Tier B — Intermediários (bom custo-benefício para iniciantes/F2P)
| Companheiro | Papel | Descrição |
|---|---|---|
| **Slime Veloz** | Suporte de Combate | Concede bônus de velocidade de ataque (ASPD) e roubo de vida (lifesteal). |
| **Filhote de Pedra** / **Porco Real** | Tanque | Cria um vínculo com o jogador e absorve dano letal, sacrificando-se para mantê-lo vivo. |
| **Máscara Sorridente** | Suporte de Cura | Aplica cura ao personagem com base no dano causado em combate. |
| **Sombra Aquática** | Utilidade | Focado em utilidade e sobrevivência nas sombras — reduz chance de ser alvo de investidas de monstros. |

### Tier C — Iniciais (obtidos logo no começo do jogo)
| Companheiro | Papel | Descrição |
|---|---|---|
| **Coelhal Bebê** | Suporte Básico | Pequeno bônus de esquiva e sorte — o primeiro companheiro que todo jogador recebe. |
| **Broteiro Domesticado** | Tanque Básico | Bônus simples de HP máximo e defesa. |
| **Gotinha de Estimação** | Suporte Mágico Básico | Bônus simples de SP máximo e regeneração. |

### 7.1 Mecânica de Evolução e Invocação
- **Fragmentos:** cada Companheiro tem seu próprio fragmento, obtido via farm em estágios específicos, eventos ou invocação (gacha). Acumular fragmentos aumenta o nível de evolução (⭐ 1 a 6), elevando status e, no nível máximo, desbloqueando a habilidade definitiva.
- **Invocação (Convocar Aliado):** usa moeda especial de invocação; taxas maiores para Tier C/B, raras para Tier A, raríssimas para Tier S — histórico de "pity" (garantia após X invocações sem sorte) recomendado para retenção saudável do jogador.
- **Vínculo (Bond):** tempo de uso e nível do Companheiro aumentam um medidor de vínculo, concedendo pequenos bônus permanentes adicionais — incentivo para não trocar de companheiro toda hora.
- **Slots ativos:** jogador pode levar um número limitado de Companheiros simultâneos (ex: 1 no início, até 3 no endgame), incentivando composições (1 tanque + 1 dano + 1 suporte, por exemplo).

---

## 8. Sistemas Específicos de Idle

### 8.1 Progresso Offline
O personagem continua "lutando" automaticamente no último estágio alcançado enquanto o jogador está fora do jogo, com um teto de horas acumuláveis (para incentivar retorno regular sem punir quem fica ausente por mais tempo).

- **Teto sugerido:** 8 horas de progresso offline acumulável (dobrável via item/assinatura opcional).
- **Fórmula de exemplo (placeholder, a balancear):**
  `Recompensa_offline = (Recompensa_por_hora_no_estágio_atual × horas_offline × fator_eficiência)`
  onde `fator_eficiência` é menor que o farm ativo (ex: 70%), para o jogo ativo continuar sendo mais vantajoso que só deixar rodando.
- Ao retornar, o jogador recebe uma tela de resumo ("Enquanto você esteve fora...") com XP, moeda e itens ganhos — momento-chave de engajamento do formato idle.

### 8.2 Sistema de Invocação (Gacha)
Usado tanto para **Companheiros** (seção 7) quanto para **Equipamentos raros/Selos de alta raridade**.

- **Moeda de invocação:** obtida via farm diário, conquistas e (opcionalmente) compra.
- **Taxas sugeridas (placeholder):** Tier C ~50%, Tier B ~30%, Tier A ~15%, Tier S ~5%.
- **Sistema de "pity" (garantia):** após um número fixo de invocações sem sair Tier S (ex: 60), a próxima invocação é garantida Tier S — prática padrão de mercado para reduzir frustração e ainda manter a expectativa do sorteio.
- **Fragmentos como consolação:** invocações duplicadas de um Companheiro/item já possuído se convertem em fragmentos de evolução, nunca em "nada".

### 8.3 Rebirth / Prestígio
Sistema de reset voluntário quando o jogador atinge um planalto de progresso, trocando o avanço atual por um bônus permanente multiplicativo.

- **Gatilho:** disponível a partir de um nível/estágio mínimo (ex: nível 100 ou Capítulo 8 concluído).
- **O que reseta:** nível do personagem e progresso de estágio.
- **O que NÃO reseta:** Companheiros coletados, Selos, cosméticos, conquistas.
- **Bônus permanente:** um multiplicador global de dano/XP/moeda que cresce a cada rebirth (ex: +5% por rebirth), incentivando ciclos de "recomeçar mais forte".
- **Camadas:** pode evoluir depois para um segundo tipo de prestígio ainda mais raro (ex: "Ascensão"), desbloqueando cosméticos ou classes especiais — fica como gancho pra conteúdo futuro.

### 8.4 Economia e Moedas
| Moeda | Obtida via | Uso principal |
|---|---|---|
| **Ouro** | Farm normal em estágios | Upgrades básicos, compra de itens comuns |
| **Fragmentos de Companheiro** | Farm específico, invocação duplicada | Evoluir Companheiros |
| **Essência de Selo** | Desmontar Selos duplicados | Reforjar (upgrade) Selos |
| **Cristal de Invocação** | Farm diário, conquistas, eventos | Invocações de Companheiros/equipamentos |
| **Gema Premium** (opcional, monetização) | Compra real ou conquistas raras | Acelerar progresso, cosméticos, conversão para Cristal de Invocação |

Regra de design importante: nenhuma moeda premium deve ser **obrigatória** para progredir no conteúdo principal — só para acelerar ou obter cosméticos, preservando a experiência F2P.

### 8.5 Eventos e Rankings
- **Eventos temporários:** estágios especiais com drops exclusivos por tempo limitado (ex: evento sazonal com um Companheiro Tier A exclusivo).
- **Ranking de Estágio:** compara até onde cada jogador chegou no modo principal — competição assíncrona, sem necessidade de servidor em tempo real.
- **Ranking de Chefe Semanal (Boss Rush):** desafio pontual contra um MVP com stats elevados, ranqueando por dano causado — bom gancho pra engajamento semanal recorrente sem exigir infraestrutura multiplayer em tempo real (mantém a Fase 1–2 do roadmap técnico simples).

---

## Próximos Passos
1. Validar/ajustar nomes e lore com você.
2. Expandir o bestiário completo (todas as 10 regiões) no mesmo padrão.
3. Expandir a árvore de classes até Job 4 com nomes e habilidades detalhadas.
4. Detalhar os sistemas de idle (fórmulas de progresso offline, curva de XP/gold).
5. Definir a arquitetura técnica (Fase 1 do roadmap) e iniciar o protótipo no Antigravity/Claude Code.
