import { useNavigate } from "react-router-dom";
import type { Game } from "../../types/types";

interface PPGameProps {
  game: Game;
}

// Convert time control string into readable format
// Example: "300+5" → "5+5 min"
function formatTimeControl(tc: string): string {
  const [base, increment] = tc.split("+").map(Number);

  // Convert base time from seconds
  const minutes = Math.floor(base / 60);
  const seconds = base % 60;

  // Keep seconds if needed
  const baseStr =
    seconds > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `${minutes}`;

  // Add increment if game has one
  return increment ? `${baseStr}+${increment} min` : `${baseStr} min`;
}

// Extract opening name from PGN
function getOpening(pgn: string | undefined): string | null {
  if (!pgn) return null;

  // Match [Opening "..."] tag
  const match = pgn.match(/\[Opening "([^"]+)"\]/);

  return match?.[1] ?? null;
}

// Every possible draw result
const DRAW_RESULTS = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "timevsinsufficient",
  "50move",
]);

export default function PPGame({ game }: PPGameProps) {
  const navigate = useNavigate();

  // Determine game result
  const whiteWon = game.white.result === "win";
  const blackWon = game.black.result === "win";
  const isDraw = DRAW_RESULTS.has(game.white.result);

  // Player row styling
  const resultClass = (won: boolean) =>
    isDraw
      ? "player-profile-draw"
      : won
        ? "player-profile-winner"
        : "player-profile-loser";

  // Result badge styling
  const badgeClass = (won: boolean) =>
    isDraw
      ? "player-profile-result-badge--draw"
      : won
        ? "player-profile-result-badge--winner"
        : "player-profile-result-badge--loser";

  // Result badge text
  const badgeLabel = (won: boolean) => (isDraw ? "Draw" : won ? "Win" : "Loss");

  // Extract game ID from URL
  // ".../live/12345" -> "12345"
  const gameId = game.url.split("/").at(-1) ?? "game";

  // Navigate to game page
  const handleClick = () => {
    navigate(`/game/${gameId}`, { state: { game } });
  };

  // Get opening name from PGN
  const opening = getOpening(game.pgn);

  return (
    <div className="PPGame-container">
      <li
        className="player-profile-games player-profile-games--clickable"
        onClick={handleClick}
      >
        {/* White player */}
        <div className={`player-profile-white-player ${resultClass(whiteWon)}`}>
          <div className="player-profile-player-left">
            <span className="player-profile-pip player-profile-pip--white" />

            {/* White username */}
            <span className="player-profile-player-name">
              {game.white.username}
            </span>
          </div>

          <div className="player-profile-player-right">
            {/* White rating */}
            <span className="player-profile-player-rating">
              {game.white.rating}
            </span>

            {/* White result */}
            <span
              className={`player-profile-result-badge ${badgeClass(whiteWon)}`}
            >
              {badgeLabel(whiteWon)}
            </span>
          </div>
        </div>

        {/* Black player */}
        <div className={`player-profile-black-player ${resultClass(blackWon)}`}>
          <div className="player-profile-player-left">
            <span className="player-profile-pip player-profile-pip--black" />

            {/* Black username */}
            <span className="player-profile-player-name">
              {game.black.username}
            </span>
          </div>

          <div className="player-profile-player-right">
            {/* Black rating */}
            <span className="player-profile-player-rating">
              {game.black.rating}
            </span>

            {/* Black result */}
            <span
              className={`player-profile-result-badge ${badgeClass(blackWon)}`}
            >
              {badgeLabel(blackWon)}
            </span>
          </div>
        </div>

        {/* Time control + opening */}
        <div className="player-profile-game-footer">
          <span className="player-profile-game-time-class">
            {game.time_class.toUpperCase()} ·{" "}
            {formatTimeControl(game.time_control)}
          </span>

          {/* Show opening if available */}
          {opening && (
            <span className="player-profile-game-opening">{opening}</span>
          )}
        </div>
      </li>
    </div>
  );
}
