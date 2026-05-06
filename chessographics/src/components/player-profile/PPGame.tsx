/**
 * PPGame (Player Profile Game) component.
 * Renders a single row in the player's recent games list,
 * showing both players and the time control.
 */

import type { Game } from '../../types/types';

interface PPGameProps {
  /** The game data from the Chess.com API */
  game: Game;
}

export default function PPGame({ game }: PPGameProps) {
  return (
    <li className="player-profile-games">
      {/* White player */}
      <div className="player-profile-white-player">
        <span className="player-profile-white-player-name">
          {game.white.username}
        </span>
        <span>white</span>
      </div>

      {/* Black player */}
      <div className="player-profile-black-player">
        <span className="player-profile-black-player-name">
          {game.black.username}
        </span>
        <span>black</span>
      </div>

      {/* Time control label (e.g. RAPID, BLITZ, BULLET) */}
      <span>{game.time_class.toUpperCase()}</span>
    </li>
  );
}
