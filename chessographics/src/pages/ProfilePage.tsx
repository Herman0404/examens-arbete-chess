import { useParams } from "react-router-dom";
import { usePlayerInfo } from "../features/player/playerInfo";
import PPGame from "../components/player-profile/PPGame";

export default function ProfilePage() {
  const { username = "" } = useParams<{ username: string }>();
  const { profile, stats, games, loading, error } = usePlayerInfo(username);

  // Loading state
  if (loading)
    return (
      <main>
        <h1>Loading...</h1>
      </main>
    );

  // Error state
  if (error)
    return (
      <main>
        <h1>Error: {error}</h1>
      </main>
    );

  if (!profile) return null;

  // Fall back to "X" if a time control hasn't been played
  const rapid = stats?.chess_rapid?.last?.rating ?? "X";
  const blitz = stats?.chess_blitz?.last?.rating ?? "X";
  const bullet = stats?.chess_bullet?.last?.rating ?? "X";

  // 10 most recent games, newest first
  const recentGames = [...games].slice(-10).reverse();

  return (
    <main>
      <h1 className="player-profile-username">{profile.username}</h1>

      {/* Rating summary */}
      <div className="player-profile-ratings">
        <div className="player-profile-rating-card">
          <span className="player-profile-rating-label">Rapid</span>
          <span className="player-profile-rating-value">{rapid}</span>
        </div>
        <div className="player-profile-rating-card">
          <span className="player-profile-rating-label">Blitz</span>
          <span className="player-profile-rating-value">{blitz}</span>
        </div>
        <div className="player-profile-rating-card">
          <span className="player-profile-rating-label">Bullet</span>
          <span className="player-profile-rating-value">{bullet}</span>
        </div>
      </div>

      {/* Recent games */}
      <div className="player-profile-games-section">
        <span className="player-profile-games-title">Recent games</span>
        <ul className="player-profile-games-list">
          {recentGames.map((game) => (
            <PPGame key={game.url} game={game} />
          ))}
        </ul>
      </div>
    </main>
  );
}
