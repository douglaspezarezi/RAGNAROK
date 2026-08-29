# Sprites da cena de combate

> **Toda a arte deste projeto precisa ser ORIGINAL.** Nunca use, referencie por
> nome de arquivo, nem tente recriar assets de Ragnarok Origin / Ragnarok Online
> (restrição de direitos autorais). Arte gerada por IA ou encomendada, sim.

Enquanto uma pasta estiver vazia, o jogo desenha um **placeholder** (forma + cor)
— nada quebra. Assim que você colocar o arquivo com o nome certo e der F5, a
imagem real aparece no lugar.

## Onde colocar cada arquivo

| Pasta | Arquivo | `id` vem de |
|---|---|---|
| `characters/` | `<jobId>.png` | `JOBS` em `@game/data` (`packages/game-data/src/classes.ts`) — ex.: `recruta.png`, `aprendiz.png`, `sentinela.png` |
| `monsters/` | `<monsterId>.png` | `MONSTERS` em `@game/data` (`bestiary.ts`) — ex.: `gotinha.png`, `salgueira-ancestral.png`, `serpente-das-profundezas.png` |
| `companions/` | `<companionId>.png` | `COMPANIONS` em `@game/data` (`companions.ts`) — ex.: `vendaval.png`, `coelhal-bebe.png` |

Os `id` são sempre **kebab-case**, minúsculos, sem acento. Para a lista completa,
veja os arquivos em `packages/game-data/src/` ou rode no console do app:
`import("@game/data").then(m => console.log(m.MONSTERS.map(x => x.id)))`.

### Convenção de arte

- **Formato:** PNG com fundo transparente (WebP também funciona — troque a
  extensão em `apps/web/lib/sprites.ts › spritePath`).
- **Tamanho:** quadrado, ~256×256 px (a cena redimensiona; o herói renderiza a
  92 px, o monstro a 96 px, o companheiro a 54 px).
- **Direção:** desenhe **o monstro virado para a ESQUERDA**; herói e companheiro
  virados para a **DIREITA** (a UI espelha herói/companheiro automaticamente, mas
  desenhar já na direção certa evita retrabalho). Se preferir, desenhe todos
  virados para a esquerda — herói/companheiro são espelhados via `flip`.
- **Enquadramento:** personagem centralizado, "pés" perto da borda de baixo (a
  cena coloca uma sombra elíptica logo abaixo).

### Sobrescrever o caminho (arte hospedada fora, nome diferente, CDN…)

Os tipos `Monster` e `Companion` (`@game/data`) têm um campo opcional
`spriteUrl?: string`. Se preenchido, ele tem prioridade sobre o caminho padrão
`/sprites/<pasta>/<id>.png`. (Personagem não tem campo — use sempre
`characters/<jobId>.png`.)

## Fundo por capítulo

Hoje o fundo é um gradiente por capítulo, em
`apps/web/lib/sprites.ts › arenaBackground(chapterNumber)` (mapa `CHAPTER_TINT`).
Para usar imagens de fundo depois, troque essa função por
`url(/sprites/backgrounds/<n>.png)` e crie a pasta `backgrounds/`.
