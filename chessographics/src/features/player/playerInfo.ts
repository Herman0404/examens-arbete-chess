import { useState, useEffect } from "react";
import { getPlayer, getPlayerStats, getRecentGames } from "../../api/chess";
import type { PlayerProfile, PlayerStats, Game } from "../../types/types";

interface PlayerState {
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  games: Game[];
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: PlayerState = {
  profile: null,
  stats: null,
  games: [],
  loading: false,
  error: null,
};

// Fetch profile, stats and recent games for a given username
export function usePlayerInfo(username: string): PlayerState {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);

  useEffect(() => {
    if (!username) return;

    // Start loading
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Fetch all three in parallel
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
