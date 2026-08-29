"use client";

/**
 * Cliente Supabase (browser). Sessão persistida em localStorage pelo próprio
 * supabase-js; sem SSR/middleware por enquanto (o jogo roda todo no client).
 *
 * Para adicionar login social depois: habilite o provider no painel do Supabase
 * e chame `supabase.auth.signInWithOAuth({ provider: "google" })`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** `false` quando faltam as variáveis de ambiente — a UI mostra instruções. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * Cliente singleton (sem tipagem gerada — os tipos de linha ficam em
 * `persistence.ts`). Lança se as env vars não estão definidas.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em apps/web/.env.local",
    );
  }
  cached ??= createClient(url as string, anonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
