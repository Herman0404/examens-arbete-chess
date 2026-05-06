/**
 * Chess.com Public API client.
 * All functions return typed responses from https://api.chess.com/pub
 */

import type { PlayerProfile, PlayerStats, Game } from '../types/types';

/** Base URL for the Chess.com public API */
const BASE = 'https://api.chess.com/pub';

/**
 * Fetches a player's public profile.
 * @throws Error if the player username is not found (HTTP 404).
 */
export async function getPlayer(username: string): Promise<PlayerProfile> {
  const res = await fetch(`${BASE}/player/${username}`);
  if (!res.ok) throw new Error(`Player "${username}" not found`);
  return res.json();
}

/**
 * Fetches a player's stats across all time controls.
 * @throws Error if the request fails.
 */
export async function getPlayerStats(username: string): Promise<PlayerStats> {
  const res = await fetch(`${BASE}/player/${username}/stats`);
  if (!res.ok) throw new Error('Could not fetch player stats');
  return res.json();
}

/**
 * Fetches the player's most recent games from their latest monthly archive.
 * Returns an empty array if no archives exist.
 */
export async function getRecentGames(username: string): Promise<Game[]> {
  // First fetch the list of all archive URLs
  const archivesRes = await fetch(`${BASE}/player/${username}/games/archives`);
  const { archives } = await archivesRes.json();

  // No archives means no games
  const latestUrl: string | undefined = archives.at(-1);
  if (!latestUrl) return [];

  // Fetch the most recent monthly archive
  const gamesRes = await fetch(latestUrl);
  const { games } = await gamesRes.json();
  return games as Game[];
}
