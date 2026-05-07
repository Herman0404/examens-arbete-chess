/**
 * ProfilePage — the player profile route ("/profile/:username").
 * Reads the username from the URL, fetches data via the playerInfo hook,
 * and renders the player's ratings and recent games.
 */

import { useParams } from "react-router-dom";
import { playerInfo } from "../features/player/playerInfo";
import PPGame from "../components/player-profile/PPGame";

export default function ProfilePage() {
  /** The :username segment from the URL */
  const { username = "" } = useParams<{ username: string }>();

  const { profile, stats, games, loading, error } = playerInfo(username);

  // Loading state
  if (loading) return <p>Loading...</p>;

  // Error state (e.g. player not found)
  if (error) return <p>Error: {error}</p>;

  // No data yet (e.g. empty username)
  if (!profile) return null;

  // Ratings
  const rapid = stats?.chess_rapid?.last?.rating ?? "X";
  const blitz = stats?.chess_blitz?.last?.rating ?? "X";
  const bullet = stats?.chess_bullet?.last?.rating ?? "X";

  // Show the 10 most recent games, newest first
  const recentGames = [...games].slice(-10).reverse();

  return (
    <main>
      <h1>{profile.username}</h1>

      {/* Rating summary */}
      <p>
        Rapid: {rapid} · Blitz: {blitz} · Bullet: {bullet}
      </p>

      {/* Recent games list */}
      <ul>
        {recentGames.map((game) => (
          <PPGame key={game.url} game={game} />
        ))}
      </ul>
    </main>
  );
}
