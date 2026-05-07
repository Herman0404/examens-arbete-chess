/**
 * PPGame (Player Profile Game) component.
 * Renders a single row in the player's recent games list,
 * showing both players and the time control.
 */

import type { Game } from "../../types/types";

interface PPGameProps {
  game: Game;
}

export default function PPGame({ game }: PPGameProps) {
  // Chess.com results:
  // "win" means winner, everything else = not winner
  const whiteWon = game.white.result === "win";
  const blackWon = game.black.result === "win";

  return (
    <div className="PPGame-container">
      <span>{game.time_class.toUpperCase()}</span>

      <li className="player-profile-games">
        {/* White player */}
        <div
          className={`player-profile-white-player ${
            whiteWon ? "player-profile-winner" : "player-profile-loser"
          }`}
        >
          <span className="player-profile-player-name">
            {game.white.username} ({game.white.rating})
          </span>
        </div>

        {/* Black player */}
        <div
          className={`player-profile-black-player ${
            blackWon ? "player-profile-winner" : "player-profile-loser"
          }`}
        >
          <span className="player-profile-player-name">
            {game.black.username} ({game.black.rating})
          </span>
        </div>
      </li>
    </div>
  );
}
