"use client";

import { useState } from "react";

import { finishTutorial, useTutorial } from "@/lib/tutorial";

interface Step {
  title: string;
  body: string;
}

/** Sequência curta de onboarding (mostrada no primeiro login e via Configurações). */
const STEPS: Step[] = [
  {
    title: "Bem-vindo a RAGNAROK",
    body: "Um Idle RPG: seu personagem luta sozinho, sem parar. Você decide a build, o equipamento e quando renascer — o combate corre no automático, inclusive enquanto você está fora.",
  },
  {
    title: "Combate automático",
    body: "Na aba Combate, seu personagem ataca o monstro atual a cada tick. Ao derrotá-lo você ganha XP e Ouro e avança para o próximo. Ao limpar todos os monstros comuns de um capítulo, o botão Avançar Estágio libera o próximo. Ficou offline? O progresso é creditado quando você volta.",
  },
  {
    title: "Selos de Batalha",
    body: "Selos são o equipamento do jogo — 7 categorias (Arma, Armadura, Escudo, Capa, Sapato, Acessório, Elmo). Eles caem de monstros ou vêm da Invocação e dão bônus de status. Equipe um por categoria na aba Equipar; os status na tela de Combate já refletem o que estiver equipado.",
  },
  {
    title: "Companheiros",
    body: "Companheiros (pets) são aliados de combate, dos tiers C ao S. Você os obtém por Invocação ou juntando fragmentos. O de maior tier que você tiver luta ao seu lado na cena de batalha.",
  },
  {
    title: "Invocação e Rebirth",
    body: "Na aba Invocar você gasta Cristais para sortear Companheiros e Selos, com um sistema de garantia (pity) após várias tentativas sem Tier S. Rebirth (Renascer) é o prestígio: quando você atinge o requisito (nível 100 ou capítulo 8 concluído), pode zerar nível e estágio em troca de um multiplicador permanente de XP e Ouro. Companheiros, Selos e conquistas são mantidos.",
  },
  {
    title: "E tem mais",
    body: "Eventos temporários com recompensas exclusivas, Ranking de Estágio, Chefe da Semana e Conquistas ficam no menu do topo. Em Configurações você ajusta som, música, a velocidade do combate e pode rever este tutorial quando quiser.",
  },
];

export function TutorialOverlay() {
  const { visible } = useTutorial();
  const [i, setI] = useState(0);

  if (!visible) return null;

  const step = STEPS[Math.min(i, STEPS.length - 1)];
  const isLast = i >= STEPS.length - 1;

  const close = () => {
    setI(0);
    finishTutorial();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Passo {i + 1} de {STEPS.length}
          </span>
          <button
            type="button"
            onClick={close}
            className="text-xs text-neutral-400 underline hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Pular tutorial
          </button>
        </div>

        <h2 className="mt-3 text-lg font-bold">{step.title}</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {step.body}
        </p>

        <div className="mt-4 flex gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 flex-1 rounded-full ${
                idx <= i
                  ? "bg-blue-600"
                  : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="rounded border border-neutral-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => (isLast ? close() : setI((v) => v + 1))}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            {isLast ? "Começar a jogar" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
