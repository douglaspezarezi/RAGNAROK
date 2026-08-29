/**
 * Ponte entre a UI e os pacotes do jogo do monorepo.
 *
 * Serve apenas para reexportar `@game/core` e `@game/data` num único lugar para
 * o app Next consumir depois. Nenhuma tela/componente aqui — só fiação.
 */

export * as GameData from "@game/data";
export * as GameCore from "@game/core";

export type { Monster, JobClass, BattleSeal, Companion } from "@game/data";
