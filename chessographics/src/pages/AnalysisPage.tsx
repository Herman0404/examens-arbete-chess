import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { analyseGames } from "../features/analysis/gameAnalysis";
import type {
  AnalysisProgress,
  GameAnalysisResult,
  MoveClass,
} from "../features/analysis/gameAnalysis";
import type { Game } from "../types/types";

const CLASS_LABEL: Record<MoveClass, string> = {
  brilliant: "Brilliant",
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

const CLASS_COLOR: Record<MoveClass, string> = {
  brilliant: "#48a7e0",
  best: "#6abf69",
  excellent: "#a8d58a",
  good: "#c8e08a",
  inaccuracy: "#f0c040",
  mistake: "#e07840",
  blunder: "#d04040",
};

function ClassBar({ counts }: { counts: Record<MoveClass, number> }) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0) return null;
  return (
    <div className="analysis-classbar">
      {(Object.keys(CLASS_LABEL) as MoveClass[]).map((cls) => {
        const pct = (counts[cls] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={cls}
            className="analysis-classbar-segment"
            style={{ width: `${pct}%`, background: CLASS_COLOR[cls] }}
            title={`${CLASS_LABEL[cls]}: ${counts[cls]}`}
          />
        );
      })}
    </div>
  );
}

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const games = location.state?.games as Game[] | undefined;
  const username = location.state?.username as string | undefined;

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(games?.map((_, i) => i) ?? []),
  );
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<GameAnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!games || !username) {
    return (
      <main>
        <p>No games to analyse.</p>
        <button className="chessboard-btn" onClick={() => navigate(-1)}>
          Go back
        </button>
      </main>
    );
  }

  const toggleGame = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(
      selected.size === games.length
        ? new Set()
        : new Set(games.map((_, i) => i)),
    );
  };

  const selectByTimeClass = (timeClass: string) => {
    setSelected(
      new Set(games.flatMap((g, i) => (g.time_class === timeClass ? [i] : []))),
    );
  };

  const timeClasses = [...new Set(games.map((g) => g.time_class))];

  const selectedGames = games.filter((_, i) => selected.has(i));

  const handleStart = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    try {
      const res = await analyseGames(selectedGames, username, setProgress);
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  // Aggregate total classification counts across all results
  const aggregate = results
    ? (() => {
        const totalCounts: Record<MoveClass, number> = {
          brilliant: 0,
          best: 0,
          excellent: 0,
          good: 0,
          inaccuracy: 0,
          mistake: 0,
          blunder: 0,
        };
        results.forEach((r) => {
          (Object.keys(r.userClassificationCounts) as MoveClass[]).forEach(
            (k) => {
              totalCounts[k] += r.userClassificationCounts[k];
            },
          );
        });

        const openingMap: Record<string, { wins: number; total: number }> = {};
        results.forEach((r) => {
          const opening = r.opening ?? "Unknown";
          if (!openingMap[opening]) openingMap[opening] = { wins: 0, total: 0 };
          openingMap[opening].total++;
          const userIsWhite = r.white.toLowerCase() === username.toLowerCase();
          const userWon = userIsWhite
            ? r.whiteResult === "win"
            : ![
                "win",
                "agreed",
                "repetition",
                "stalemate",
                "insufficient",
                "timevsinsufficient",
                "50move",
              ].includes(r.whiteResult);
          if (userWon) openingMap[opening].wins++;
        });

        // Opening book accuracy: % of first 10 moves classified as best/brilliant
        let bookMoves = 0;
        let bookTotal = 0;
        results.forEach((r) => {
          const userColor = r.userColor;
          const userMoves = r.moves
            .filter((m) => m.color === userColor)
            .slice(0, 10);
          bookTotal += userMoves.length;
          bookMoves += userMoves.filter(
            (m) =>
              m.classification === "best" ||
              m.classification === "brilliant" ||
              m.classification === "excellent",
          ).length;
        });
        const bookAccuracy =
          bookTotal > 0 ? Math.round((bookMoves / bookTotal) * 100) : null;

        return { totalCounts, openingMap, bookAccuracy };
      })()
    : null;

  const progressPct = progress
    ? Math.round(
        ((progress.currentGame - 1) * 100 +
          (progress.currentMove / progress.totalMoves) * 100) /
          progress.totalGames,
      )
    : 0;

  return (
    <main>
      <h1 className="player-profile-username">{username} — Analysis</h1>

      {/* Setup */}
      {!running && !results && (
        <div className="analysis-setup">
          {/* Game selector */}
          <div className="analysis-game-selector">
            <div className="analysis-game-selector-header">
              <p className="analysis-setup-label">Select games</p>
              <div className="analysis-select-btns">
                <button className="analysis-select-all" onClick={toggleAll}>
                  {selected.size === games.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
                {timeClasses.map((tc) => (
                  <button
                    key={tc}
                    className="analysis-select-all"
                    onClick={() => selectByTimeClass(tc)}
                  >
                    {tc.charAt(0).toUpperCase() + tc.slice(1)} only
                  </button>
                ))}
              </div>
            </div>
            <div className="analysis-game-list">
              {games.map((game, i) => {
                const isChecked = selected.has(i);
                return (
                  <label
                    key={game.url}
                    className={`analysis-game-checkbox ${isChecked ? "analysis-game-checkbox--checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGame(i)}
                    />
                    <span className="analysis-game-checkbox-label">
                      {game.white.username} vs {game.black.username}
                    </span>
                    <span className="analysis-game-checkbox-meta">
                      {game.time_class.toUpperCase()}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <p className="analysis-setup-info">
            {selected.size} game{selected.size !== 1 ? "s" : ""} selected
          </p>
          <button
            className="analysis-start-btn"
            onClick={handleStart}
            disabled={selected.size === 0}
          >
            Start analysis
          </button>
        </div>
      )}

      {/* Progress */}
      {running && progress && (
        <div className="analysis-progress">
          <p className="analysis-progress-label">
            Game {progress.currentGame}/{progress.totalGames} · Move{" "}
            {progress.currentMove}/{progress.totalMoves}
          </p>
          <div className="analysis-progress-track">
            <div
              className="analysis-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="analysis-progress-pct">{progressPct}%</p>
        </div>
      )}

      {error && <p className="analysis-error">{error}</p>}

      {/* Results */}
      {aggregate && results && (
        <div className="analysis-results">
          <div className="analysis-section">
            <p className="analysis-section-title">
              Move classifications — all games
            </p>
            <ClassBar counts={aggregate.totalCounts} />
            <div className="analysis-classifications">
              {(Object.keys(CLASS_LABEL) as MoveClass[]).map((cls) => (
                <div key={cls} className="analysis-class-row">
                  <span
                    className="analysis-class-dot"
                    style={{ background: CLASS_COLOR[cls] }}
                  />
                  <span className="analysis-class-label">
                    {CLASS_LABEL[cls]}
                  </span>
                  <span className="analysis-class-count">
                    {aggregate.totalCounts[cls]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-section">
            <p className="analysis-section-title">
              Move classifications — per game
            </p>
            <div className="analysis-per-game">
              {results.map((r) => (
                <div key={r.gameUrl} className="analysis-game-block">
                  <span className="analysis-game-players">
                    {r.white} vs {r.black}
                  </span>
                  <ClassBar counts={r.userClassificationCounts} />
                  <div className="analysis-game-counts">
                    {(Object.keys(CLASS_LABEL) as MoveClass[]).map(
                      (cls) =>
                        r.userClassificationCounts[cls] > 0 && (
                          <span key={cls} className="analysis-game-count-item">
                            <span
                              className="analysis-class-dot analysis-class-dot--sm"
                              style={{ background: CLASS_COLOR[cls] }}
                            />
                            {r.userClassificationCounts[cls]}
                          </span>
                        ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-section">
            <p className="analysis-section-title">Winrate by opening</p>
            <div className="analysis-openings">
              {Object.entries(aggregate.openingMap)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([opening, { wins, total }]) => {
                  const pct = Math.round((wins / total) * 100);
                  return (
                    <div key={opening} className="analysis-opening-row">
                      <span className="analysis-opening-name">{opening}</span>
                      <div className="analysis-opening-bar-track">
                        <div
                          className="analysis-opening-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="analysis-opening-pct">{pct}%</span>
                      <span className="analysis-opening-games">({total}g)</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <button
            className="player-profile-load-more"
            onClick={() => navigate(-1)}
          >
            ← Back to profile
          </button>
        </div>
      )}
    </main>
  );
}
