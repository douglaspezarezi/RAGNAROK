"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { OfflineRewardsSummary } from "@game/core";

import {
  checkOfflineProgress,
  clearStore,
  flushSaves,
  getMeta,
  hydrate,
  saveNow,
  setBackgrounded,
  startAutosave,
  stopAutosave,
  useIsSaving,
} from "@/lib/gameStore";
import { loadBundle, touchLastSeenBeacon } from "@/lib/persistence";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Toaster } from "@/lib/toast";
import { AuthScreen } from "./AuthScreen";
import { OfflineRewardsModal } from "./OfflineRewardsModal";

type Phase = "loading" | "config" | "auth" | "ready" | "error";

const NAV = [
  { href: "/", label: "Combate" },
  { href: "/equipment", label: "Equipar" },
  { href: "/summon", label: "Invocar" },
  { href: "/events", label: "Eventos" },
  { href: "/leaderboard", label: "Ranking" },
  { href: "/weekly-boss", label: "Chefe da Semana" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [offline, setOffline] = useState<OfflineRewardsSummary | null>(null);
  const loadedUserId = useRef<string | null>(null);
  const entering = useRef(false);

  const enterWithUser = useCallback(
    async (userId: string, userEmail: string | null) => {
      if (loadedUserId.current === userId || entering.current) return;
      entering.current = true;
      setPhase("loading");
      try {
        const bundle = await loadBundle(userId);
        if (!bundle) {
          setPhase("error");
          return;
        }
        hydrate(bundle);
        loadedUserId.current = userId;
        setEmail(userEmail);
        startAutosave();
        const summary = await checkOfflineProgress();
        if (summary) setOffline(summary);
        setPhase("ready");
      } finally {
        entering.current = false;
      }
    },
    [],
  );

  // --- sessão -----------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPhase("config");
      return;
    }
    const supabase = getSupabase();
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session?.user) {
        const { id, email: mail } = session.user;
        setTimeout(() => void enterWithUser(id, mail ?? null), 0);
      } else if (event === "SIGNED_OUT" || !session) {
        loadedUserId.current = null;
        clearStore();
        setEmail(null);
        setOffline(null);
        setPhase("auth");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        const { id, email: mail } = data.session.user;
        void enterWithUser(id, mail ?? null);
      } else {
        setPhase((p) => (p === "loading" ? "auth" : p));
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [enterWithUser]);

  // --- salvar / retomar ao trocar de aba ------------------------------
  useEffect(() => {
    if (phase !== "ready") return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setBackgrounded(true);
        void saveNow();
      } else {
        setBackgrounded(false);
        void flushSaves()
          .then(() => checkOfflineProgress())
          .then((s) => {
            if (s) setOffline(s);
          });
      }
    };
    const onPageHide = () => {
      void saveNow();
      const m = getMeta();
      if (m) touchLastSeenBeacon(m.playerId);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [phase]);

  useEffect(() => () => stopAutosave(), []);

  async function signOut() {
    await saveNow();
    stopAutosave();
    await getSupabase().auth.signOut();
  }

  if (phase === "loading") {
    return <main className="p-6 text-sm text-neutral-400">Carregando…</main>;
  }
  if (phase === "config") return <ConfigMissing />;
  if (phase === "error") {
    return (
      <main className="mx-auto max-w-md p-6 text-sm">
        <p className="text-red-500">Não foi possível carregar seu progresso.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded border border-neutral-300 px-3 py-1 dark:border-neutral-700"
        >
          Tentar de novo
        </button>
        <Toaster />
      </main>
    );
  }
  if (phase === "auth") {
    return (
      <>
        <AuthScreen />
        <Toaster />
      </>
    );
  }

  // phase === "ready"
  return (
    <>
      <TopBar email={email} onSignOut={() => void signOut()} />
      <div className="flex-1">{children}</div>
      {offline ? (
        <OfflineRewardsModal
          summary={offline}
          onClose={() => setOffline(null)}
        />
      ) : null}
      <Toaster />
    </>
  );
}

function TopBar({
  email,
  onSignOut,
}: {
  email: string | null;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const saving = useIsSaving();

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
      <nav className="flex gap-1 text-sm">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-2 py-1 ${
                active
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:text-[color:inherit]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className={saving ? "opacity-100" : "opacity-0"}>💾 salvando…</span>
        <span className="max-w-[160px] truncate">{email}</span>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

function ConfigMissing() {
  return (
    <main className="mx-auto max-w-lg p-6 text-sm">
      <h1 className="text-lg font-bold">Configure o Supabase</h1>
      <p className="mt-2 text-neutral-500">
        Crie <code>apps/web/.env.local</code> com:
      </p>
      <pre className="mt-2 overflow-x-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-900">
        {`NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key`}
      </pre>
      <p className="mt-2 text-neutral-500">
        e reinicie o <code>next dev</code>. Passo a passo em{" "}
        <code>SUPABASE_SETUP.md</code>.
      </p>
    </main>
  );
}
