/**
 * Custom React hook for loading all player data in parallel.
 * Combines profile, stats, and recent games into a single state object.
 */

import { useState, useEffect } from 'react';
import { getPlayer, getPlayerStats, getRecentGames } from '../../api/chess';
import type { PlayerProfile, PlayerStats, Game } from '../../types/types';

/** The shape of state managed by the usePlayer hook */
interface PlayerState {
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  games: Game[];
  loading: boolean;
  error: string | null;
}

/** Initial empty state before any fetch begins */
const INITIAL_STATE: PlayerState = {
  profile: null,
  stats: null,
  games: [],
  loading: false,
  error: null,
};

/**
 * Fetches a player's profile, stats, and recent games in parallel.
 * Re-fetches whenever the username changes.
 *
 * @param username - A Chess.com username to look up
 * @returns Current loading/error state plus fetched data
 */
export function usePlayer(username: string): PlayerState {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);

  useEffect(() => {
    // Skip fetch if no username is provided
    if (!username) return;

    // Start loading, clear any previous error
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Fetch all three endpoints in parallel for performance
    Promise.all([
      getPlayer(username),
      getPlayerStats(username),
      getRecentGames(username),
    ])
      .then(([profile, stats, games]) => {
        setState({ profile, stats, games, loading: false, error: null });
      })
      .catch((err: Error) => {
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
  }, [username]);

  return state;
}
