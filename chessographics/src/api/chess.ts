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

// Fetch the most recent monthly archive of games
export async function getRecentGames(username: string): Promise<Game[]> {
  const archivesRes = await fetch(`${BASE}/player/${username}/games/archives`);
  const { archives } = await archivesRes.json();

  const latestUrl: string | undefined = archives.at(-1);
  if (!latestUrl) return [];

  const gamesRes = await fetch(latestUrl);
  const { games } = await gamesRes.json();
  return games as Game[];
}
