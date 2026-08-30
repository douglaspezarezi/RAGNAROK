"use client";

import { useState } from "react";

import { getSupabase } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setNotice(null);
    setBusy(true);
    try {
      const supabase = getSupabase();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }

        // Caminho feliz: confirmação de e-mail desligada -> já vem sessão.
        // O onAuthStateChange do AppShell assume e entra no jogo.
        if (data.session) {
          toast.success("Conta criada! Entrando…");
          return;
        }

        // Sem sessão no signUp: tenta logar na hora com as mesmas credenciais
        // (funciona quando "Confirm email" está desligado no projeto Supabase).
        const signIn = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signIn.data.session) {
          toast.success("Conta criada! Entrando…");
          return;
        }

        // Ainda sem sessão -> o projeto Supabase está exigindo confirmação.
        setNotice(
          'Conta criada, mas o projeto Supabase está com "Confirm email" ligado. ' +
            "Para entrar direto no jogo sem confirmação, desligue em " +
            "Authentication → Providers → Email no painel do Supabase e cadastre-se de novo.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      // Em sucesso com sessão, o onAuthStateChange do AppShell assume daqui.
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao autenticar.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          RAGNAROK{" "}
          <span className="font-normal text-neutral-400">— protótipo</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "signin" ? "Entre para continuar" : "Crie sua conta"}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm text-[color:inherit] dark:border-neutral-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
          Senha
          <input
            type="password"
            required
            minLength={6}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm text-[color:inherit] dark:border-neutral-700"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy
            ? "Aguarde…"
            : mode === "signin"
              ? "Entrar"
              : "Criar conta e entrar"}
        </button>
        {mode === "signup" ? (
          <p className="text-center text-[11px] text-neutral-400">
            Sem confirmação por e-mail — você entra no jogo na hora.
          </p>
        ) : null}
      </form>

      {notice ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {notice}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setNotice(null);
        }}
        className="text-xs text-neutral-500 underline underline-offset-2"
      >
        {mode === "signin"
          ? "Não tem conta? Cadastre-se"
          : "Já tem conta? Entrar"}
      </button>

      {/* Login social: habilitar o provider no painel do Supabase e chamar
          supabase.auth.signInWithOAuth({ provider }). Ainda não implementado. */}
      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          disabled
          title="Em breve"
          className="cursor-not-allowed rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-400 dark:border-neutral-700"
        >
          Continuar com Google (em breve)
        </button>
      </div>
    </main>
  );
}
