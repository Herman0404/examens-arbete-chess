import { ecoToName } from "./ecoNames";
import type { Game } from "../../types/types";

export interface OpeningStat {
  opening: string;
  wins: number;
  draws: number;
  losses: number;
  total: number;
}

// Extract opening name from PGN
function getOpening(pgn: string | undefined): string | null {
  if (!pgn) return null;
  const eco = pgn.match(/\[ECO "([^"]+)"\]/)?.[1];
  if (eco) {
    const name = ecoToName(eco);
    if (name) return name;
  }
  const opening = pgn.match(/\[Opening "([^"]+)"\]/)?.[1];
  if (opening) return opening.split(/[:,]/)[0].trim();
  return null;
}

const DRAW_RESULTS = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "timevsinsufficient",
  "50move",
]);

// Compute opening stats from a list of games for a given username
export function computeOpeningStats(
  games: Game[],
  username: string,
): OpeningStat[] {
  const map: Record<string, OpeningStat> = {};

  for (const game of games) {
    const opening = getOpening(game.pgn) ?? "Unknown";
    if (!map[opening])
      map[opening] = { opening, wins: 0, draws: 0, losses: 0, total: 0 };

    const stat = map[opening];
    stat.total++;

    const userIsWhite =
      game.white.username.toLowerCase() === username.toLowerCase();
    const result = userIsWhite ? game.white.result : game.black.result;

    if (result === "win") stat.wins++;
    else if (DRAW_RESULTS.has(result)) stat.draws++;
    else stat.losses++;
  }

  // Sort by most played
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ─── Color stats ────────────────────────────────────────────────────────────

export interface ColorStats {
  white: { wins: number; draws: number; losses: number; total: number };
  black: { wins: number; draws: number; losses: number; total: number };
}

const DRAW_RESULTS_SET = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "timevsinsufficient",
  "50move",
]);

export function computeColorStats(games: Game[], username: string): ColorStats {
  const stats: ColorStats = {
    white: { wins: 0, draws: 0, losses: 0, total: 0 },
    black: { wins: 0, draws: 0, losses: 0, total: 0 },
  };

  for (const game of games) {
    const userIsWhite =
      game.white.username.toLowerCase() === username.toLowerCase();
    const side = userIsWhite ? "white" : "black";
    const result = userIsWhite ? game.white.result : game.black.result;

    stats[side].total++;
    if (result === "win") stats[side].wins++;
    else if (DRAW_RESULTS_SET.has(result)) stats[side].draws++;
    else stats[side].losses++;
  }

  return stats;
}

// ─── Average time per move ───────────────────────────────────────────────────

export interface TimeStats {
  avgSecondsPerMove: number | null; // null if no clock data found
}

// Parse clock times from PGN comments: { [%clk H:MM:SS] }
function parseClocks(pgn: string): number[] {
  const matches = [...pgn.matchAll(/\[%clk (\d+):(\d+):(\d+)\]/g)];
  return matches.map(
    ([, h, m, s]) => parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s),
  );
}

export function computeTimeStats(games: Game[], username: string): TimeStats {
  let totalSeconds = 0;
  let totalMoves = 0;

  for (const game of games) {
    if (!game.pgn) continue;
    const clocks = parseClocks(game.pgn);
    if (clocks.length < 2) continue;

    const userIsWhite =
      game.white.username.toLowerCase() === username.toLowerCase();
    // White moves are at even indices (0, 2, 4...), black at odd (1, 3, 5...)
    const userClocks = clocks.filter((_, i) =>
      userIsWhite ? i % 2 === 0 : i % 2 === 1,
    );

    // Time spent per move = clock before - clock after
    for (let i = 0; i < userClocks.length - 1; i++) {
      const spent = userClocks[i] - userClocks[i + 1];
      if (spent >= 0 && spent < 300) {
        // ignore negative or >5min (disconnect etc.)
        totalSeconds += spent;
        totalMoves++;
      }
    }
  }

  if (totalMoves === 0) return { avgSecondsPerMove: null };
  return { avgSecondsPerMove: Math.round(totalSeconds / totalMoves) };
}
