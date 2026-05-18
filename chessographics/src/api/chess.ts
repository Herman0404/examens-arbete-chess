import type { PlayerProfile, PlayerStats, Game } from "../types/types";

const BASE = "https://api.chess.com/pub";

// Fetch player profile
export async function getPlayer(username: string): Promise<PlayerProfile> {
  const res = await fetch(`${BASE}/player/${username}`);
  if (!res.ok) throw new Error(`Player "${username}" not found`);
  return res.json();
}

// Fetch player stats
export async function getPlayerStats(username: string): Promise<PlayerStats> {
  const res = await fetch(`${BASE}/player/${username}/stats`);
  if (!res.ok) throw new Error("Could not fetch player stats");
  return res.json();
}

// Fetch the N most recent games, working backwards through monthly archives
export async function getRecentGames(
  username: string,
  count = 5,
): Promise<Game[]> {
  const archivesRes = await fetch(`${BASE}/player/${username}/games/archives`);
  const { archives } = await archivesRes.json();

  if (!archives?.length) return [];

  const games: Game[] = [];

  for (let i = archives.length - 1; i >= 0 && games.length < count; i--) {
    const res = await fetch(archives[i]);
    const { games: monthGames } = await res.json();
    games.unshift(...monthGames);
  }

  return games.slice(-count);
}
