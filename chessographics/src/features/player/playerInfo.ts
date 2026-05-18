import { useState, useEffect } from "react";
import { getPlayer, getPlayerStats, getRecentGames } from "../../api/chess";
import type { PlayerProfile, PlayerStats, Game } from "../../types/types";

const INITIAL_COUNT = 5;
const LOAD_MORE_COUNT = 5;

// Info in player
interface PlayerState {
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  games: Game[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

// Empty player
const INITIAL_STATE: PlayerState = {
  profile: null,
  stats: null,
  games: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  error: null,
};

export function usePlayerInfo(username: string) {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const [count, setCount] = useState(INITIAL_COUNT);

  // Fetch profile and stats once
  useEffect(() => {
    if (!username) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    Promise.all([getPlayer(username), getPlayerStats(username)])
      .then(([profile, stats]) => {
        setState((prev) => ({ ...prev, profile, stats, loading: false }));
      })
      .catch((err: Error) => {
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
  }, [username]);

  // Fetch games whenever count increases
  useEffect(() => {
    if (!username) return;
    setState((prev) => ({ ...prev, loadingMore: true }));

    getRecentGames(username, count)
      .then((games) => {
        setState((prev) => ({
          ...prev,
          games,
          loadingMore: false,
          // If we got fewer than requested, there are no more to load
          hasMore: games.length === count,
        }));
      })
      .catch((err: Error) => {
        setState((prev) => ({
          ...prev,
          loadingMore: false,
          error: err.message,
        }));
      });
  }, [username, count]);

  const loadMore = () => setCount((prev) => prev + LOAD_MORE_COUNT);

  return { ...state, loadMore };
}
