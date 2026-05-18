import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { usePlayerInfo } from "../features/player/playerInfo";
import {
  computeOpeningStats,
  computeTimeStats,
} from "../features/analysis/openingStats";
import PPGame from "../components/player-profile/PPGame";

export default function ProfilePage() {
  const { username = "" } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const {
    profile,
    stats,
    games,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  } = usePlayerInfo(username);

  const openingStats = useMemo(
    () => computeOpeningStats(games, username),
    [games, username],
  );
  const timeStats = useMemo(
    () => computeTimeStats(games, username),
    [games, username],
  );

  if (loading)
    return (
      <main>
        <h1>Loading...</h1>
      </main>
    );
  if (error)
    return (
      <main>
        <h1>Error: {error}</h1>
      </main>
    );
  if (!profile) return null;

  const recentGames = [...games].reverse();

  const formatTime = (s: number) =>
    s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

  const loadedWins = games.filter((g) => {
    const userIsWhite =
      g.white.username.toLowerCase() === username.toLowerCase();
    return userIsWhite ? g.white.result === "win" : g.black.result === "win";
  }).length;
  const loadedWinPct =
    games.length > 0 ? Math.round((loadedWins / games.length) * 100) : null;

  const TIME_CONTROLS = [
    { key: "chess_rapid" as const, label: "Rapid" },
    { key: "chess_blitz" as const, label: "Blitz" },
    { key: "chess_bullet" as const, label: "Bullet" },
  ];

  return (
    <main>
      <h1 className="player-profile-username">{profile.username}</h1>

      {/* ── ALL TIME ── */}
      <div className="profile-block">
        <p className="profile-block-title">All Time</p>

        {/* Ratings */}
        <p className="profile-section-label">Rating</p>
        <div className="profile-row">
          {TIME_CONTROLS.map(({ key, label }) => {
            const rating = stats?.[key]?.last?.rating;
            const best = stats?.[key]?.best?.rating;
            if (!rating) return null;
            return (
              <div key={key} className="profile-card">
                <span className="profile-card-label">{label}</span>
                <span className="profile-card-value">{rating}</span>
                {best && <span className="profile-card-sub">Peak {best}</span>}
              </div>
            );
          })}
        </div>

        {/* W/D/L */}
        <p className="profile-section-label">Record</p>
        <div className="opening-stats-list">
          {TIME_CONTROLS.map(({ key, label }) => {
            const record = stats?.[key]?.record;
            if (!record) return null;
            const { win, loss, draw } = record;
            const total = win + loss + draw;
            if (total === 0) return null;
            const wp = (win / total) * 100;
            const dp = (draw / total) * 100;
            const lp = (loss / total) * 100;
            return (
              <div key={key} className="opening-stat-row">
                <span className="opening-stat-name">{label}</span>
                <div className="opening-stat-bar">
                  <div
                    style={{
                      width: `${wp}%`,
                      height: "100%",
                      background: "rgba(100,150,100,0.7)",
                    }}
                  />
                  <div
                    style={{
                      width: `${dp}%`,
                      height: "100%",
                      background: "rgba(190,175,155,0.7)",
                    }}
                  />
                  <div
                    style={{
                      width: `${lp}%`,
                      height: "100%",
                      background: "rgba(200,80,80,0.5)",
                    }}
                  />
                </div>
                <span className="opening-stat-record">
                  <span className="opening-stat-w">{win}W</span>
                  <span className="opening-stat-d">{draw}D</span>
                  <span className="opening-stat-l">{loss}L</span>
                </span>
                <span className="opening-stat-total">{Math.round(wp)}%</span>
              </div>
            );
          })}
        </div>

        {/* Total games */}
        <p className="profile-section-label">Total games</p>
        <div className="profile-row">
          {TIME_CONTROLS.map(({ key, label }) => {
            const record = stats?.[key]?.record;
            if (!record) return null;
            const total = record.win + record.loss + record.draw;
            if (total === 0) return null;
            return (
              <div key={key} className="profile-card">
                <span className="profile-card-label">{label}</span>
                <span className="profile-card-value">
                  {total.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LATEST GAMES ── */}
      <div className="profile-block">
        <p className="profile-block-title">Latest Games</p>

        {/* Quick stats */}
        {games.length > 0 && (
          <>
            <p className="profile-section-label">
              Stats ({games.length} games)
            </p>
            <div className="profile-row">
              {loadedWinPct !== null && (
                <div className="profile-card">
                  <span className="profile-card-label">Win rate</span>
                  <span
                    className="profile-card-value"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {loadedWinPct}%
                  </span>
                </div>
              )}
              {timeStats.avgSecondsPerMove !== null && (
                <div className="profile-card">
                  <span className="profile-card-label">Avg/move</span>
                  <span
                    className="profile-card-value"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {formatTime(timeStats.avgSecondsPerMove)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Openings */}
        {openingStats.length > 0 && (
          <>
            <p className="profile-section-label">Openings</p>
            <div className="opening-stats-list">
              {openingStats.slice(0, 6).map((s) => {
                const wp = Math.round((s.wins / s.total) * 100);
                const dp = Math.round((s.draws / s.total) * 100);
                const lp = 100 - wp - dp;
                return (
                  <div key={s.opening} className="opening-stat-row">
                    <span className="opening-stat-name">{s.opening}</span>
                    <div className="opening-stat-bar">
                      <div
                        className="opening-stat-bar-win"
                        style={{ width: `${wp}%` }}
                      />
                      <div
                        className="opening-stat-bar-draw"
                        style={{ width: `${dp}%` }}
                      />
                      <div
                        className="opening-stat-bar-loss"
                        style={{ width: `${lp}%` }}
                      />
                    </div>
                    <span className="opening-stat-record">
                      <span className="opening-stat-w">{s.wins}W</span>
                      <span className="opening-stat-d">{s.draws}D</span>
                      <span className="opening-stat-l">{s.losses}L</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Analyse */}
        <button
          className="analysis-start-btn"
          onClick={() =>
            navigate(`/analysis/${username}`, {
              state: { games: recentGames, username },
            })
          }
        >
          Analyse {games.length} games
        </button>

        {/* Games list */}
        <p className="profile-section-label">Recent games</p>
        <ul
          className="player-profile-games-list"
          style={{ height: "auto", maxHeight: 500 }}
        >
          {recentGames.map((game) => (
            <PPGame key={game.url} game={game} />
          ))}
        </ul>
        {hasMore && (
          <button
            className="player-profile-load-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load 5 more"}
          </button>
        )}
      </div>
    </main>
  );
}
